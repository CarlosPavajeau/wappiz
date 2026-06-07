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
