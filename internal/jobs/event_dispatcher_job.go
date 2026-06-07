package jobs

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"wappiz/internal/events"
	"wappiz/pkg/db"
	eventsmetrics "wappiz/pkg/events/metrics"
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

const (
	eventDispatchFallbackInterval = 10 * time.Second
	claimRenewInterval            = 3 * time.Minute
)

func NewEventDispatcher(cfg EventDispatcherConfig) Job {
	return &eventDispatcherJob{
		db:         cfg.DB,
		connString: cfg.ConnString,
		dispatcher: cfg.Dispatcher,
	}
}

func (j *eventDispatcherJob) Run(ctx context.Context) {
	ticker := time.NewTicker(eventDispatchFallbackInterval)
	defer ticker.Stop()

	logger.Info("[event_dispatcher_job] started")

	// notifyCh receives a signal whenever pg_notify fires on "domain_events".
	notifyCh := make(chan struct{}, 1)
	go j.listen(ctx, notifyCh)
	signalProcess(notifyCh)

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
		eventsmetrics.ListenerUp.Set(1)
		signalProcess(notifyCh)

		for ctx.Err() == nil {
			if _, err := conn.WaitForNotification(ctx); err != nil {
				eventsmetrics.ListenerUp.Set(0)
				if ctx.Err() != nil {
					conn.Close(ctx)
					return
				}
				logger.Warn("[event_dispatcher_job] listener connection lost, retrying in 5s", "err", err)
				conn.Close(ctx)
				select {
				case <-ctx.Done():
					return
				case <-time.After(5 * time.Second):
				}
				break
			}

			signalProcess(notifyCh)
		}
	}
}

func signalProcess(notifyCh chan<- struct{}) {
	select {
	case notifyCh <- struct{}{}:
	default:
	}
}

func (j *eventDispatcherJob) process(ctx context.Context) error {
	seen := make([]uuid.UUID, 0)
	var processErrs []error

	for ctx.Err() == nil {
		claimID := uuid.New()
		claimed, err := db.TxWithResult(ctx, j.db.Primary(), func(ctx context.Context, txx db.DBTX) ([]db.ClaimPendingDomainEventsRow, error) {
			rows, err := db.Query.ClaimPendingDomainEvents(ctx, txx, db.ClaimPendingDomainEventsParams{
				ClaimID:     claimID,
				ExcludedIds: seen,
			})
			if err != nil {
				return nil, fault.Wrap(err, fault.Internal("claim pending domain events"))
			}
			return rows, nil
		})
		if err != nil {
			return errors.Join(append(processErrs, err)...)
		}
		if len(claimed) == 0 {
			return errors.Join(processErrs...)
		}

		eventsmetrics.EventsClaimedTotal.Add(float64(len(claimed)))
		for _, row := range claimed {
			seen = append(seen, row.ID)
		}
		if err := j.processClaim(ctx, claimID, claimed); err != nil {
			processErrs = append(processErrs, err)
		}
	}

	return errors.Join(processErrs...)
}

func (j *eventDispatcherJob) processClaim(ctx context.Context, claimID uuid.UUID, claimed []db.ClaimPendingDomainEventsRow) error {
	stopRenewal := j.startClaimRenewal(ctx, claimID)
	var markErrs []error

	for _, row := range claimed {
		event := events.Event{
			ID:        row.ID,
			TenantID:  row.TenantID,
			EventType: events.Type(row.EventType),
			Payload:   []byte(row.Payload),
			CreatedAt: row.CreatedAt,
		}

		dispatchErr := j.dispatch(ctx, event)
		if dispatchErr != nil {
			eventsmetrics.EventsFailedTotal.WithLabelValues(string(event.EventType)).Inc()
		}

		if markErr := j.mark(ctx, row.ID, claimID, dispatchErr); markErr != nil {
			markErrs = append(markErrs, fault.Wrap(markErr, fault.Internal("mark domain event")))
			continue
		}
		if dispatchErr == nil {
			eventsmetrics.EventsProcessedTotal.WithLabelValues(string(event.EventType)).Inc()
		}
	}

	return errors.Join(errors.Join(markErrs...), stopRenewal())
}

func (j *eventDispatcherJob) dispatch(ctx context.Context, event events.Event) error {
	completedIDs, err := db.Query.FindCompletedDomainEventHandlers(ctx, j.db.Primary(), event.ID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("find completed domain event handlers"))
	}
	completed := make(map[events.HandlerID]struct{}, len(completedIDs))
	for _, id := range completedIDs {
		completed[events.HandlerID(id)] = struct{}{}
	}

	results, dispatchErr := j.dispatcher.Dispatch(ctx, event, completed)
	errs := []error{dispatchErr}
	for _, result := range results {
		if result.Err != nil {
			errs = append(errs, result.Err)
			continue
		}
		if err := db.Query.InsertDomainEventHandlerCompletion(ctx, j.db.Primary(), db.InsertDomainEventHandlerCompletionParams{
			EventID:   event.ID,
			HandlerID: string(result.HandlerID),
		}); err != nil {
			errs = append(errs, fault.Wrap(err, fault.Internal("insert domain event handler completion")))
		}
	}
	return errors.Join(errs...)
}

func (j *eventDispatcherJob) startClaimRenewal(ctx context.Context, claimID uuid.UUID) func() error {
	renewCtx, cancel := context.WithCancel(ctx)
	done := make(chan error, 1)
	go func() {
		ticker := time.NewTicker(claimRenewInterval)
		defer ticker.Stop()

		var renewErr error
		for {
			select {
			case <-renewCtx.Done():
				done <- renewErr
				return
			case <-ticker.C:
				if _, err := db.Query.RenewDomainEventClaim(renewCtx, j.db.Primary(), claimID); err != nil {
					if errors.Is(err, context.Canceled) && renewCtx.Err() != nil {
						done <- renewErr
						return
					}
					if renewErr == nil {
						renewErr = fault.Wrap(err, fault.Internal("renew domain event claim"))
					}
				}
			}
		}
	}()
	return func() error {
		cancel()
		return <-done
	}
}

func (j *eventDispatcherJob) mark(ctx context.Context, id, claimID uuid.UUID, dispatchErr error) error {
	return db.Tx(ctx, j.db.Primary(), func(ctx context.Context, txx db.DBTX) error {
		var affected int64
		var err error
		if dispatchErr == nil {
			affected, err = db.Query.MarkDomainEventProcessed(ctx, txx, db.MarkDomainEventProcessedParams{
				ID:      id,
				ClaimID: claimID,
			})
		} else {
			msg := dispatchErr.Error()
			if len(msg) > 1000 {
				msg = msg[:1000]
			}
			affected, err = db.Query.MarkDomainEventFailed(ctx, txx, db.MarkDomainEventFailedParams{
				ID:        id,
				ClaimID:   claimID,
				LastError: sql.NullString{String: msg, Valid: true},
			})
		}
		if err != nil {
			return err
		}
		if affected == 0 {
			return fault.New("domain event claim ownership lost")
		}
		return nil
	})
}
