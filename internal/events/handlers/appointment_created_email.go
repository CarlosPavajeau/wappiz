package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"wappiz/internal/events"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/mailer"
)

// AppointmentCreatedEmailHandler sends an email to the tenant owner when an
// appointment is confirmed.
type AppointmentCreatedEmailHandler struct {
	db     db.Database
	mailer mailer.Mailer
}

const appointmentCreatedEmailHandlerID events.HandlerID = "appointment-created-email-v1"

func NewAppointmentCreatedEmailHandler(database db.Database, m mailer.Mailer) *AppointmentCreatedEmailHandler {
	return &AppointmentCreatedEmailHandler{db: database, mailer: m}
}

func (h *AppointmentCreatedEmailHandler) HandlerID() events.HandlerID {
	return appointmentCreatedEmailHandlerID
}

func (h *AppointmentCreatedEmailHandler) EventType() events.Type {
	return events.TypeAppointmentCreated
}

func (h *AppointmentCreatedEmailHandler) Handle(ctx context.Context, event events.Event) error {
	var payload events.AppointmentCreatedPayload
	if err := json.Unmarshal(event.Payload, &payload); err != nil {
		return fault.Wrap(err, fault.Internal("unmarshal appointment.created payload"))
	}

	ownerEmail, err := db.Query.FindTenantOwnerEmail(ctx, h.db.Primary(), payload.TenantID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("find tenant owner email"))
	}

	return h.mailer.Send(ctx, mailer.Email{
		To:             ownerEmail,
		Subject:        "Nueva cita confirmada",
		Body:           buildAppointmentCreatedEmail(payload),
		IdempotencyKey: fmt.Sprintf("domain-event/%s/%s", event.ID.String(), h.HandlerID()),
	})
}

func buildAppointmentCreatedEmail(p events.AppointmentCreatedPayload) string {
	loc, err := time.LoadLocation("America/Bogota")
	if err != nil {
		loc = time.UTC
	}
	startsAt := p.StartsAt.In(loc).Format("02 Jan 2006 a las 15:04")
	return fmt.Sprintf(`
<html><body>
<h2>Nueva cita confirmada</h2>
<p>Se ha agendado una nueva cita para el <strong>%s</strong>.</p>
<p>Ingresa al panel para ver los detalles.</p>
</body></html>`, startsAt)
}
