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
	return db.Tx(ctx, j.db.Primary(), func(ctx context.Context, txx db.DBTX) error {
		rows, err := db.Query.ClaimPendingDomainEvents(ctx, txx)
		if err != nil {
			return fault.Wrap(err, fault.Internal("claim pending domain events"))
		}

		for _, row := range rows {
			event := events.Event{
				ID:        row.ID,
				TenantID:  row.TenantID,
				EventType: events.Type(row.EventType),
				Payload:   []byte(row.Payload),
				CreatedAt: row.CreatedAt,
			}

			if err := j.dispatcher.Dispatch(ctx, event); err != nil {
				j.markFailed(ctx, txx, row.ID, err)
				continue
			}

			if err := db.Query.MarkDomainEventProcessed(ctx, txx, row.ID); err != nil {
				logger.Warn("[event_dispatcher_job] failed to mark event processed",
					"event_id", row.ID,
					"err", err)
			}
		}

		return nil
	})
}

func (j *eventDispatcherJob) markFailed(ctx context.Context, txx db.DBTX, id uuid.UUID, dispatchErr error) {
	msg := dispatchErr.Error()
	if len(msg) > 1000 {
		msg = msg[:1000]
	}

	if err := db.Query.MarkDomainEventFailed(ctx, txx, db.MarkDomainEventFailedParams{
		ID:        id,
		LastError: sql.NullString{String: msg, Valid: true},
	}); err != nil {
		logger.Warn("[event_dispatcher_job] failed to mark event as failed",
			"event_id", id,
			"err", err)
	}
}
