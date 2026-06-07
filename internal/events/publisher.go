package events

import (
	"context"

	"github.com/google/uuid"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
)

// Publisher writes events to the domain_events outbox table.
type Publisher struct{}

func NewPublisher() *Publisher { return &Publisher{} }

// Publish inserts one row per event into domain_events.
// txx must come from the enclosing db.Tx callback so the insert is atomic
// with the business operation. On transaction rollback the rows are discarded.
// PostgreSQL delivers pg_notify messages issued inside a transaction only
// after commit, so the dispatcher is woken only for durable outbox rows.
func (p *Publisher) Publish(ctx context.Context, txx db.DBTX, events ...Event) error {
	if len(events) == 0 {
		return nil
	}

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
	if _, err := txx.ExecContext(ctx, "SELECT pg_notify('domain_events', '')"); err != nil {
		return fault.Wrap(err, fault.Internal("notify domain events"))
	}
	return nil
}
