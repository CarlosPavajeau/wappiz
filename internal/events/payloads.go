package events

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"wappiz/pkg/fault"
)

// AppointmentCreatedPayload is the structured payload for TypeAppointmentCreated.
type AppointmentCreatedPayload struct {
	AppointmentID uuid.UUID `json:"appointment_id"`
	TenantID      uuid.UUID `json:"tenant_id"`
	CustomerID    uuid.UUID `json:"customer_id"`
	ServiceID     uuid.UUID `json:"service_id"`
	ResourceID    uuid.UUID `json:"resource_id"`
	StartsAt      time.Time `json:"starts_at"`
	EndsAt        time.Time `json:"ends_at"`
}

// AppointmentCanceledPayload is the structured payload for TypeAppointmentCanceled.
type AppointmentCanceledPayload struct {
	AppointmentID uuid.UUID `json:"appointment_id"`
	TenantID      uuid.UUID `json:"tenant_id"`
	CustomerID    uuid.UUID `json:"customer_id"`
	ServiceID     uuid.UUID `json:"service_id"`
	ResourceID    uuid.UUID `json:"resource_id"`
	StartsAt      time.Time `json:"starts_at"`
	EndsAt        time.Time `json:"ends_at"`
}

// AppointmentRescheduledPayload is the structured payload for TypeAppointmentRescheduled.
type AppointmentRescheduledPayload struct {
	AppointmentID    uuid.UUID `json:"appointment_id"`
	TenantID         uuid.UUID `json:"tenant_id"`
	CustomerID       uuid.UUID `json:"customer_id"`
	ServiceID        uuid.UUID `json:"service_id"`
	ResourceID       uuid.UUID `json:"resource_id"`
	PreviousStartsAt time.Time `json:"previous_starts_at"`
	PreviousEndsAt   time.Time `json:"previous_ends_at"`
	StartsAt         time.Time `json:"starts_at"`
	EndsAt           time.Time `json:"ends_at"`
}

// NewAppointmentCreated constructs an Event with the payload serialised to JSON.
func NewAppointmentCreated(p AppointmentCreatedPayload) (Event, error) {
	raw, err := json.Marshal(p)
	if err != nil {
		return Event{}, fault.Wrap(err, fault.Internal("marshal appointment.created payload"))
	}
	return Event{
		TenantID:  p.TenantID,
		EventType: TypeAppointmentCreated,
		Payload:   raw,
	}, nil
}

// NewAppointmentCanceled constructs an Event with the payload serialised to JSON.
func NewAppointmentCanceled(p AppointmentCanceledPayload) (Event, error) {
	raw, err := json.Marshal(p)
	if err != nil {
		return Event{}, fault.Wrap(err, fault.Internal("marshal appointment.canceled payload"))
	}
	return Event{
		TenantID:  p.TenantID,
		EventType: TypeAppointmentCanceled,
		Payload:   raw,
	}, nil
}

// NewAppointmentRescheduled constructs an Event with the payload serialised to JSON.
func NewAppointmentRescheduled(p AppointmentRescheduledPayload) (Event, error) {
	raw, err := json.Marshal(p)
	if err != nil {
		return Event{}, fault.Wrap(err, fault.Internal("marshal appointment.rescheduled payload"))
	}
	return Event{
		TenantID:  p.TenantID,
		EventType: TypeAppointmentRescheduled,
		Payload:   raw,
	}, nil
}
