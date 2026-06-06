package jobs

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"wappiz/internal/events"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/logger"
)

// EventDispatcherConfig holds dependencies for the event dispatcher job.
type EventDispatcherConfig struct {
	DB         db.Database
	ConnString string // raw DSN for the dedicated pgx LISTEN connection
	Dispatcher *events.Dispatcher
}

type eventDispatcherJob struct {
	db         db.Database
	connString string
	dispatcher *events.Dispatcher
}

func NewEventDispatcher(cfg EventDispatcherConfig) Job {
	return &eventDispatcherJob{
		db:         cfg.DB,
		connString: cfg.ConnString,
		dispatcher: cfg.Dispatcher,
	}
}

func (j *eventDispatcherJob) Run(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	logger.Info("[event_dispatcher_job] started")

	// notifyCh receives a signal whenever pg_notify fires on "domain_events".
	notifyCh := make(chan struct{}, 1)
	go j.listen(ctx, notifyCh)

	for {
		select {
		case <-ctx.Done():
			logger.Info("[event_dispatcher_job] stopped")
			return
		case <-notifyCh:
			if err := j.process(ctx); err != nil {
				logger.Error("[event_dispatcher_job] process error (notify)", "err", err)
			}
		case <-ticker.C:
			if err := j.process(ctx); err != nil {
				logger.Error("[event_dispatcher_job] process error (ticker)", "err", err)
			}
		}
	}
}

// listen holds a dedicated pgx connection and forwards LISTEN notifications
// to notifyCh. It reconnects automatically on connection failure.
func (j *eventDispatcherJob) listen(ctx context.Context, notifyCh chan<- struct{}) {
	for ctx.Err() == nil {
		conn, err := pgx.Connect(ctx, j.connString)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			logger.Warn("[event_dispatcher_job] listener connect failed, retrying in 5s", "err", err)
			select {
			case <-ctx.Done():
				return
			case <-time.After(5 * time.Second):
			}
			continue
		}

		if _, err := conn.Exec(ctx, "LISTEN domain_events"); err != nil {
			conn.Close(ctx)
			logger.Warn("[event_dispatcher_job] LISTEN failed, retrying in 5s", "err", err)
			select {
			case <-ctx.Done():
				return
			case <-time.After(5 * time.Second):
			}
			continue
		}

		logger.Info("[event_dispatcher_job] listener connected")

		for ctx.Err() == nil {
			if _, err := conn.WaitForNotification(ctx); err != nil {
				if ctx.Err() != nil {
					conn.Close(ctx)
					return
				}
				logger.Warn("[event_dispatcher_job] listener connection lost, reconnecting", "err", err)
				conn.Close(ctx)
				break
			}

			select {
			case notifyCh <- struct{}{}:
			default: // already a pending signal; no need to queue another
			}
		}
	}
}

func (j *eventDispatcherJob) process(ctx context.Context) error {
	// Phase 1: claim rows and commit immediately to release FOR UPDATE locks.
	// No I/O beyond the DB query happens here.
	claimed, err := db.TxWithResult(ctx, j.db.Primary(), func(ctx context.Context, txx db.DBTX) ([]db.ClaimPendingDomainEventsRow, error) {
		rows, err := db.Query.ClaimPendingDomainEvents(ctx, txx)
		if err != nil {
			return nil, fault.Wrap(err, fault.Internal("claim pending domain events"))
		}
		return rows, nil
	})
	if err != nil {
		return err
	}

	// Phase 2: dispatch each event and mark it in its own short transaction.
	// External I/O (HTTP, mailer) happens outside any DB transaction.
	for _, row := range claimed {
		event := events.Event{
			ID:        row.ID,
			TenantID:  row.TenantID,
			EventType: events.Type(row.EventType),
			Payload:   []byte(row.Payload),
			CreatedAt: row.CreatedAt,
		}

		dispatchErr := j.dispatcher.Dispatch(ctx, event)

		if markErr := j.mark(ctx, row.ID, dispatchErr); markErr != nil {
			return fault.Wrap(markErr, fault.Internal("mark domain event"))
		}
	}

	return nil
}

func (j *eventDispatcherJob) mark(ctx context.Context, id uuid.UUID, dispatchErr error) error {
	return db.Tx(ctx, j.db.Primary(), func(ctx context.Context, txx db.DBTX) error {
		if dispatchErr == nil {
			return db.Query.MarkDomainEventProcessed(ctx, txx, id)
		}

		msg := dispatchErr.Error()
		if len(msg) > 1000 {
			msg = msg[:1000]
		}

		return db.Query.MarkDomainEventFailed(ctx, txx, db.MarkDomainEventFailedParams{
			ID:        id,
			LastError: sql.NullString{String: msg, Valid: true},
		})
	})
}
