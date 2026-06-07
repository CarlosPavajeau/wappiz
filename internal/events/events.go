package events

import (
	"context"
	"errors"
	"fmt"
	"time"

	"wappiz/pkg/fault"
	"wappiz/pkg/logger"

	"github.com/google/uuid"
)

// Type identifies a domain event kind.
type Type string

const (
	TypeAppointmentCreated Type = "appointment.created"
)

// Event is the runtime representation of a domain_events row.
type Event struct {
	ID        uuid.UUID
	TenantID  uuid.UUID
	EventType Type
	Payload   []byte // raw JSON payload
	CreatedAt time.Time
}

// Handler processes events of a specific type.
type Handler interface {
	EventType() Type
	Handle(ctx context.Context, event Event) error
}

// Dispatcher fans out events to all registered handlers for the event type.
// Register is not safe for concurrent use — call it at startup before any goroutine starts.
type Dispatcher struct {
	handlers map[Type][]Handler
}

func NewDispatcher() *Dispatcher {
	return &Dispatcher{handlers: make(map[Type][]Handler)}
}

func (d *Dispatcher) Register(h Handler) {
	t := h.EventType()
	d.handlers[t] = append(d.handlers[t], h)
}

// Dispatch calls every registered handler for event.EventType in order.
// All handlers are called even if one fails; errors are joined and returned.
func (d *Dispatcher) Dispatch(ctx context.Context, event Event) error {
	handlers := d.handlers[event.EventType]
	if len(handlers) == 0 {
		logger.Warn("[events] no handlers registered",
			"event_type", string(event.EventType),
			"event_id", event.ID)
		return fault.New(
			fmt.Sprintf("no handlers for event %s", string(event.EventType)),
		)
	}

	var errs []error
	for _, h := range handlers {
		if err := h.Handle(ctx, event); err != nil {
			logger.Warn("[events] handler error",
				"event_type", string(event.EventType),
				"event_id", event.ID,
				"handler", fmt.Sprintf("%T", h),
				"err", err)
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}
