package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"strings"
	"time"

	"wappiz/internal/events"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/mailer"
)

// AppointmentRescheduledEmailHandler sends an email to the tenant owner when an
// appointment is rescheduled by the customer.
type AppointmentRescheduledEmailHandler struct {
	db     db.Database
	mailer mailer.Mailer
}

const appointmentRescheduledEmailHandlerID events.HandlerID = "appointment-rescheduled-email-v1"

func NewAppointmentRescheduledEmailHandler(database db.Database, m mailer.Mailer) *AppointmentRescheduledEmailHandler {
	return &AppointmentRescheduledEmailHandler{db: database, mailer: m}
}

func (h *AppointmentRescheduledEmailHandler) HandlerID() events.HandlerID {
	return appointmentRescheduledEmailHandlerID
}

func (h *AppointmentRescheduledEmailHandler) EventType() events.Type {
	return events.TypeAppointmentRescheduled
}

func (h *AppointmentRescheduledEmailHandler) Handle(ctx context.Context, event events.Event) error {
	var payload events.AppointmentRescheduledPayload
	if err := json.Unmarshal(event.Payload, &payload); err != nil {
		return fault.Wrap(err, fault.Internal("unmarshal appointment.rescheduled payload"))
	}

	ownerEmail, err := db.Query.FindTenantOwnerEmail(ctx, h.db.Primary(), payload.TenantID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("find tenant owner email"))
	}

	customer, err := db.Query.FindCustomerByID(ctx, h.db.Primary(), payload.CustomerID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("find customer by id"))
	}

	service, err := db.Query.FindServiceByID(ctx, h.db.Primary(), payload.ServiceID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("find service by id"))
	}

	resource, err := db.Query.FindResourceById(ctx, h.db.Primary(), payload.ResourceID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("find resource by id"))
	}

	customerName := "Cliente sin nombre"
	if customer.Name.Valid && strings.TrimSpace(customer.Name.String) != "" {
		customerName = strings.TrimSpace(customer.Name.String)
	}

	return h.mailer.Send(ctx, mailer.Email{
		To:      ownerEmail,
		Subject: fmt.Sprintf("Cita reagendada: %s - %s", customerName, service.Name),
		Body: buildAppointmentRescheduledEmail(appointmentRescheduledEmailDetails{
			CustomerName:     customerName,
			CustomerPhone:    customer.PhoneNumber,
			ServiceName:      service.Name,
			ResourceName:     resource.Name,
			DurationMinutes:  service.DurationMinutes,
			Price:            service.Price,
			PreviousStartsAt: payload.PreviousStartsAt,
			PreviousEndsAt:   payload.PreviousEndsAt,
			StartsAt:         payload.StartsAt,
			EndsAt:           payload.EndsAt,
		}),
		IdempotencyKey: fmt.Sprintf("domain-event/%s/%s", event.ID.String(), h.HandlerID()),
	})
}

type appointmentRescheduledEmailDetails struct {
	CustomerName     string
	CustomerPhone    string
	ServiceName      string
	ResourceName     string
	DurationMinutes  int32
	Price            string
	PreviousStartsAt time.Time
	PreviousEndsAt   time.Time
	StartsAt         time.Time
	EndsAt           time.Time
}

func buildAppointmentRescheduledEmail(details appointmentRescheduledEmailDetails) string {
	loc, err := time.LoadLocation("America/Bogota")
	if err != nil {
		loc = time.UTC
	}

	previousStartsAt := details.PreviousStartsAt.In(loc)
	previousEndsAt := details.PreviousEndsAt.In(loc)
	startsAt := details.StartsAt.In(loc)
	endsAt := details.EndsAt.In(loc)
	return fmt.Sprintf(`
<html>
<body style="margin:0;background:#f5f7f5;color:#172019;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
<div style="background:#ffffff;border:1px solid #dfe5e0;border-radius:12px;padding:28px;">
<p style="margin:0 0 8px;color:#2d5f9a;font-size:13px;font-weight:700;text-transform:uppercase;">Cita reagendada</p>
<h1 style="margin:0 0 24px;font-size:24px;line-height:1.25;">Cita reagendada con %s</h1>
<table style="width:100%%;border-collapse:collapse;font-size:15px;line-height:1.5;">
<tr><td style="padding:10px 0;color:#637067;">Cliente</td><td style="padding:10px 0;text-align:right;font-weight:600;">%s</td></tr>
<tr><td style="padding:10px 0;color:#637067;border-top:1px solid #edf0ed;">Teléfono</td><td style="padding:10px 0;text-align:right;border-top:1px solid #edf0ed;">%s</td></tr>
<tr><td style="padding:10px 0;color:#637067;border-top:1px solid #edf0ed;">Servicio</td><td style="padding:10px 0;text-align:right;border-top:1px solid #edf0ed;font-weight:600;">%s</td></tr>
<tr><td style="padding:10px 0;color:#637067;border-top:1px solid #edf0ed;">Recurso</td><td style="padding:10px 0;text-align:right;border-top:1px solid #edf0ed;">%s</td></tr>
<tr><td style="padding:10px 0;color:#637067;border-top:1px solid #edf0ed;">Fecha anterior</td><td style="padding:10px 0;text-align:right;border-top:1px solid #edf0ed;">%s, %s - %s</td></tr>
<tr><td style="padding:10px 0;color:#637067;border-top:1px solid #edf0ed;">Nueva fecha</td><td style="padding:10px 0;text-align:right;border-top:1px solid #edf0ed;font-weight:600;">%s, %s - %s</td></tr>
<tr><td style="padding:10px 0;color:#637067;border-top:1px solid #edf0ed;">Duración</td><td style="padding:10px 0;text-align:right;border-top:1px solid #edf0ed;">%d minutos</td></tr>
<tr><td style="padding:10px 0;color:#637067;border-top:1px solid #edf0ed;">Precio</td><td style="padding:10px 0;text-align:right;border-top:1px solid #edf0ed;font-weight:600;">$%s</td></tr>
</table>
<p style="margin:24px 0 0;color:#637067;font-size:13px;">La cita fue reagendada por el cliente desde WhatsApp.</p>
</div>
</div>
</body>
</html>`,
		html.EscapeString(details.CustomerName),
		html.EscapeString(details.CustomerName),
		html.EscapeString(details.CustomerPhone),
		html.EscapeString(details.ServiceName),
		html.EscapeString(details.ResourceName),
		previousStartsAt.Format("02/01/2006"),
		previousStartsAt.Format("15:04"),
		previousEndsAt.Format("15:04"),
		startsAt.Format("02/01/2006"),
		startsAt.Format("15:04"),
		endsAt.Format("15:04"),
		details.DurationMinutes,
		html.EscapeString(details.Price),
	)
}
