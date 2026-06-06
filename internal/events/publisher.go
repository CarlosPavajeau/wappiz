package events

import (
	"context"

	"github.com/google/uuid"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/logger"
)

// Publisher writes events to the domain_events outbox table.
type Publisher struct{}

func NewPublisher() *Publisher { return &Publisher{} }

// Publish inserts one row per event into domain_events.
// txx must come from the enclosing db.Tx callback so the insert is atomic
// with the business operation. On transaction rollback the rows are discarded.
func (p *Publisher) Publish(ctx context.Context, txx db.DBTX, events ...Event) error {
	for _, e := range events {
		if err := db.Query.InsertDomainEvent(ctx, txx, db.InsertDomainEventParams{
			ID:        uuid.New(),
			TenantID:  e.TenantID,
			EventType: string(e.EventType),
			Payload:   e.Payload,
		}); err != nil {
			return fault.Wrap(err, fault.Internal("insert domain event"))
		}
	}
	return nil
}

// Notify sends a pg_notify signal on the "domain_events" channel so the
// dispatcher job wakes up immediately. Call this outside the business
// transaction after it commits. A failure here is non-fatal: the fallback
// ticker in the dispatcher job will process pending rows within 5 minutes.
func (p *Publisher) Notify(ctx context.Context, conn db.DBTX) {
	if _, err := conn.ExecContext(ctx, "SELECT pg_notify('domain_events', '')"); err != nil {
		logger.Warn("[events] pg_notify failed, dispatcher will pick up via fallback ticker", "err", err)
	}
}
