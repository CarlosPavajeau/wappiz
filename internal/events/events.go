package events

import (
	"context"
	"fmt"
	"time"

	"wappiz/pkg/fault"
	"wappiz/pkg/logger"

	"github.com/google/uuid"
)

// Type identifies a domain event kind.
type Type string

// HandlerID is a stable identifier used to persist handler completion.
type HandlerID string

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

// Handler processes events of a specific type. HandlerID must remain stable
// across deployments. Handle must be idempotent for a given event ID.
type Handler interface {
	HandlerID() HandlerID
	EventType() Type
	Handle(ctx context.Context, event Event) error
}

type HandlerResult struct {
	HandlerID HandlerID
	Err       error
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
	id := h.HandlerID()
	if id == "" {
		panic("events: handler ID must not be empty")
	}
	for _, registered := range d.handlers[t] {
		if registered.HandlerID() == id {
			panic(fmt.Sprintf("events: duplicate handler ID %q for event type %q", id, t))
		}
	}
	d.handlers[t] = append(d.handlers[t], h)
}

// Dispatch calls every registered handler for event.EventType in order.
// Already completed handlers are skipped. All pending handlers are called even
// if one fails, and panics are converted to errors.
func (d *Dispatcher) Dispatch(ctx context.Context, event Event, completed map[HandlerID]struct{}) ([]HandlerResult, error) {
	handlers := d.handlers[event.EventType]
	if len(handlers) == 0 {
		logger.Warn("[events] no handlers registered",
			"event_type", string(event.EventType),
			"event_id", event.ID)
		return nil, fault.New(
			fmt.Sprintf("no handlers for event %s", string(event.EventType)),
		)
	}

	results := make([]HandlerResult, 0, len(handlers))
	for _, h := range handlers {
		id := h.HandlerID()
		if _, ok := completed[id]; ok {
			continue
		}

		err := callHandler(ctx, h, event)
		if err != nil {
			logger.Warn("[events] handler error",
				"event_type", string(event.EventType),
				"event_id", event.ID,
				"handler", fmt.Sprintf("%T", h),
				"err", err)
		}
		results = append(results, HandlerResult{HandlerID: id, Err: err})
	}
	return results, nil
}

func callHandler(ctx context.Context, handler Handler, event Event) (err error) {
	defer func() {
		if recovered := recover(); recovered != nil {
			err = fmt.Errorf("handler %q panicked: %v", handler.HandlerID(), recovered)
		}
	}()
	return handler.Handle(ctx, event)
}
