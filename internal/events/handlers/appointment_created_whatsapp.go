package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"wappiz/internal/events"
	"wappiz/pkg/crypto"
	"wappiz/pkg/datetime"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/logger"
	"wappiz/pkg/whatsapp"
)

// AppointmentConfirmedTemplateName is the WhatsApp message template sent to
// customers who book from the public booking page. Every tenant's WhatsApp
// Business Account must have it approved (category UTILITY, language es)
// with this body:
//
//	Hola {{1}}, tu cita en {{2}} quedó confirmada ✅
//
//	Servicio: {{3}}
//	Con: {{4}}
//	Fecha: {{5}}
//
//	Si necesitas cancelar o reagendar, responde a este mensaje.
const AppointmentConfirmedTemplateName = "appointment_confirmed"

const appointmentConfirmedTemplateLanguage = "es"

// AppointmentCreatedWhatsAppHandler confirms appointments booked from the
// public booking page to the customer over WhatsApp. The customer has
// usually never messaged the business, so it must use a template.
type AppointmentCreatedWhatsAppHandler struct {
	db       db.Database
	whatsapp whatsapp.Client
	crypto   *crypto.Service
}

const appointmentCreatedWhatsAppHandlerID events.HandlerID = "appointment-created-whatsapp-v1"

// appointmentCreatedWhatsAppMaxAttempts bounds how often a confirmation is
// retried. Past it the booking is old enough that a late "confirmed" message
// would confuse more than help, so the handler gives up.
const appointmentCreatedWhatsAppMaxAttempts = 3

func NewAppointmentCreatedWhatsAppHandler(
	database db.Database,
	wa whatsapp.Client,
	cryptoSvc *crypto.Service,
) *AppointmentCreatedWhatsAppHandler {
	return &AppointmentCreatedWhatsAppHandler{
		db:       database,
		whatsapp: wa,
		crypto:   cryptoSvc,
	}
}

func (h *AppointmentCreatedWhatsAppHandler) HandlerID() events.HandlerID {
	return appointmentCreatedWhatsAppHandlerID
}

func (h *AppointmentCreatedWhatsAppHandler) EventType() events.Type {
	return events.TypeAppointmentCreated
}

func (h *AppointmentCreatedWhatsAppHandler) Handle(ctx context.Context, event events.Event) error {
	err := h.handle(ctx, event)
	if err == nil || event.Attempts+1 < appointmentCreatedWhatsAppMaxAttempts {
		return err
	}
	// Reporting success records the handler as completed, so it is not
	// retried while the event's other handlers keep their own retries.
	logger.Error("[appointment_created_whatsapp] giving up on booking confirmation",
		"event_id", event.ID,
		"tenant_id", event.TenantID,
		"attempts", event.Attempts+1,
		"err", err)
	return nil
}

func (h *AppointmentCreatedWhatsAppHandler) handle(ctx context.Context, event events.Event) error {
	var payload events.AppointmentCreatedPayload
	if err := json.Unmarshal(event.Payload, &payload); err != nil {
		return fault.Wrap(err, fault.Internal("unmarshal appointment.created payload"))
	}
	// The bot confirms in-chat and dashboard bookings are announced by the
	// owner, so only public page bookings need a message.
	if payload.Source != events.AppointmentCreatedSourcePublic {
		return nil
	}

	// The public page only takes bookings while WhatsApp can send, and the
	// customer was told a confirmation is on its way. Losing that ability
	// afterwards is a failure, not a skip, so it surfaces and is retried.
	waConfig, err := db.Query.FindTenantWhatsappConfig(ctx, h.db.Primary(), payload.TenantID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fault.Wrap(err, fault.Internal("tenant has no whatsapp config to confirm public booking"))
		}
		return fault.Wrap(err, fault.Internal("find tenant whatsapp config"))
	}
	if !waConfig.CanSend() {
		return fault.New("whatsapp not ready",
			fault.Internal("tenant whatsapp config cannot send public booking confirmation"))
	}

	tenant, err := db.Query.FindTenantByID(ctx, h.db.Primary(), payload.TenantID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("find tenant by id"))
	}
	loc, err := time.LoadLocation(tenant.Timezone)
	if err != nil {
		return fault.Wrap(err, fault.Internal("load tenant timezone"))
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

	accessToken, err := h.crypto.Decrypt(waConfig.AccessToken.String)
	if err != nil {
		return fault.Wrap(err, fault.Internal("decrypt whatsapp access token"))
	}

	tpl := buildAppointmentConfirmedTemplate(appointmentConfirmedDetails{
		CustomerName: customer.Name.String,
		BusinessName: tenant.Name,
		ServiceName:  service.Name,
		ResourceName: resource.Name,
		StartsAt:     payload.StartsAt,
		Location:     loc,
	})

	if err := h.whatsapp.SendTemplate(ctx, customer.PhoneNumber, waConfig.PhoneNumberID.String, accessToken, tpl); err != nil {
		return fault.Wrap(err, fault.Internal("send appointment confirmed whatsapp template"))
	}

	return nil
}

type appointmentConfirmedDetails struct {
	CustomerName string
	BusinessName string
	ServiceName  string
	ResourceName string
	StartsAt     time.Time
	Location     *time.Location
}

func buildAppointmentConfirmedTemplate(d appointmentConfirmedDetails) whatsapp.Template {
	// Meta rejects empty template parameters.
	customerName := strings.TrimSpace(d.CustomerName)
	if customerName == "" {
		customerName = "👋"
	}

	return whatsapp.Template{
		Name:     AppointmentConfirmedTemplateName,
		Language: appointmentConfirmedTemplateLanguage,
		BodyParams: []string{
			customerName,
			d.BusinessName,
			d.ServiceName,
			d.ResourceName,
			datetime.FormatTimeIn(d.StartsAt, d.Location, "Monday, 02 de January de 2006 a las 3:04 PM"),
		},
	}
}
