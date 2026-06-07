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

// AppointmentCanceledEmailHandler sends an email to the tenant owner when an
// appointment is canceled.
type AppointmentCanceledEmailHandler struct {
	db     db.Database
	mailer mailer.Mailer
}

const appointmentCanceledEmailHandlerID events.HandlerID = "appointment-canceled-email-v1"

func NewAppointmentCanceledEmailHandler(database db.Database, m mailer.Mailer) *AppointmentCanceledEmailHandler {
	return &AppointmentCanceledEmailHandler{db: database, mailer: m}
}

func (h *AppointmentCanceledEmailHandler) HandlerID() events.HandlerID {
	return appointmentCanceledEmailHandlerID
}

func (h *AppointmentCanceledEmailHandler) EventType() events.Type {
	return events.TypeAppointmentCanceled
}

func (h *AppointmentCanceledEmailHandler) Handle(ctx context.Context, event events.Event) error {
	var payload events.AppointmentCanceledPayload
	if err := json.Unmarshal(event.Payload, &payload); err != nil {
		return fault.Wrap(err, fault.Internal("unmarshal appointment.canceled payload"))
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
		Subject: fmt.Sprintf("Cita cancelada: %s - %s", customerName, service.Name),
		Body: buildAppointmentCanceledEmail(appointmentCanceledEmailDetails{
			CustomerName:    customerName,
			CustomerPhone:   customer.PhoneNumber,
			ServiceName:     service.Name,
			ResourceName:    resource.Name,
			DurationMinutes: service.DurationMinutes,
			Price:           service.Price,
			StartsAt:        payload.StartsAt,
			EndsAt:          payload.EndsAt,
		}),
		IdempotencyKey: fmt.Sprintf("domain-event/%s/%s", event.ID.String(), h.HandlerID()),
	})
}

type appointmentCanceledEmailDetails struct {
	CustomerName    string
	CustomerPhone   string
	ServiceName     string
	ResourceName    string
	DurationMinutes int32
	Price           string
	StartsAt        time.Time
	EndsAt          time.Time
}

func buildAppointmentCanceledEmail(details appointmentCanceledEmailDetails) string {
	loc, err := time.LoadLocation("America/Bogota")
	if err != nil {
		loc = time.UTC
	}

	startsAt := details.StartsAt.In(loc)
	endsAt := details.EndsAt.In(loc)
	return fmt.Sprintf(`
<html>
<body style="margin:0;background:#f7f5f4;color:#211817;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
<div style="background:#ffffff;border:1px solid #e7dedb;border-radius:12px;padding:28px;">
<p style="margin:0 0 8px;color:#b42318;font-size:13px;font-weight:700;text-transform:uppercase;">Cita cancelada</p>
<h1 style="margin:0 0 24px;font-size:24px;line-height:1.25;">Cita cancelada con %s</h1>
<table style="width:100%%;border-collapse:collapse;font-size:15px;line-height:1.5;">
<tr><td style="padding:10px 0;color:#706562;">Cliente</td><td style="padding:10px 0;text-align:right;font-weight:600;">%s</td></tr>
<tr><td style="padding:10px 0;color:#706562;border-top:1px solid #f0ecea;">Teléfono</td><td style="padding:10px 0;text-align:right;border-top:1px solid #f0ecea;">%s</td></tr>
<tr><td style="padding:10px 0;color:#706562;border-top:1px solid #f0ecea;">Servicio</td><td style="padding:10px 0;text-align:right;border-top:1px solid #f0ecea;font-weight:600;">%s</td></tr>
<tr><td style="padding:10px 0;color:#706562;border-top:1px solid #f0ecea;">Recurso</td><td style="padding:10px 0;text-align:right;border-top:1px solid #f0ecea;">%s</td></tr>
<tr><td style="padding:10px 0;color:#706562;border-top:1px solid #f0ecea;">Fecha</td><td style="padding:10px 0;text-align:right;border-top:1px solid #f0ecea;">%s</td></tr>
<tr><td style="padding:10px 0;color:#706562;border-top:1px solid #f0ecea;">Horario</td><td style="padding:10px 0;text-align:right;border-top:1px solid #f0ecea;">%s - %s</td></tr>
<tr><td style="padding:10px 0;color:#706562;border-top:1px solid #f0ecea;">Duración</td><td style="padding:10px 0;text-align:right;border-top:1px solid #f0ecea;">%d minutos</td></tr>
<tr><td style="padding:10px 0;color:#706562;border-top:1px solid #f0ecea;">Precio</td><td style="padding:10px 0;text-align:right;border-top:1px solid #f0ecea;font-weight:600;">$%s</td></tr>
</table>
<p style="margin:24px 0 0;color:#706562;font-size:13px;">La cita fue cancelada por el cliente desde WhatsApp.</p>
</div>
</div>
</body>
</html>`,
		html.EscapeString(details.CustomerName),
		html.EscapeString(details.CustomerName),
		html.EscapeString(details.CustomerPhone),
		html.EscapeString(details.ServiceName),
		html.EscapeString(details.ResourceName),
		startsAt.Format("02/01/2006"),
		startsAt.Format("15:04"),
		endsAt.Format("15:04"),
		details.DurationMinutes,
		html.EscapeString(details.Price),
	)
}
