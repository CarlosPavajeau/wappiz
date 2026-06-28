package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"wappiz/internal/events"
	"wappiz/pkg/crypto"
	"wappiz/pkg/datetime"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/whatsapp"
)

// AppointmentRescheduledWhatsAppHandler notifies the customer when an admin
// moves a confirmed appointment from the web calendar.
type AppointmentRescheduledWhatsAppHandler struct {
	db       db.Database
	whatsapp whatsapp.Client
	crypto   *crypto.Service
}

const appointmentRescheduledWhatsAppHandlerID events.HandlerID = "appointment-rescheduled-whatsapp-v1"

func NewAppointmentRescheduledWhatsAppHandler(
	database db.Database,
	wa whatsapp.Client,
	cryptoSvc *crypto.Service,
) *AppointmentRescheduledWhatsAppHandler {
	return &AppointmentRescheduledWhatsAppHandler{
		db:       database,
		whatsapp: wa,
		crypto:   cryptoSvc,
	}
}

func (h *AppointmentRescheduledWhatsAppHandler) HandlerID() events.HandlerID {
	return appointmentRescheduledWhatsAppHandlerID
}

func (h *AppointmentRescheduledWhatsAppHandler) EventType() events.Type {
	return events.TypeAppointmentRescheduled
}

func (h *AppointmentRescheduledWhatsAppHandler) Handle(ctx context.Context, event events.Event) error {
	var payload events.AppointmentRescheduledPayload
	if err := json.Unmarshal(event.Payload, &payload); err != nil {
		return fault.Wrap(err, fault.Internal("unmarshal appointment.rescheduled payload"))
	}
	if payload.RescheduledBy != events.AppointmentRescheduledByAdmin {
		return nil
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

	waConfig, err := db.Query.FindTenantWhatsappConfig(ctx, h.db.Primary(), payload.TenantID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil
		}
		return fault.Wrap(err, fault.Internal("find tenant whatsapp config"))
	}
	if !waConfig.IsActive || !waConfig.PhoneNumberID.Valid || !waConfig.AccessToken.Valid {
		return nil
	}

	accessToken, err := h.crypto.Decrypt(waConfig.AccessToken.String)
	if err != nil {
		return fault.Wrap(err, fault.Internal("decrypt whatsapp access token"))
	}

	customerName := "Hola"
	if customer.Name.Valid && strings.TrimSpace(customer.Name.String) != "" {
		customerName = fmt.Sprintf("Hola %s", strings.TrimSpace(customer.Name.String))
	}

	body := fmt.Sprintf(
		"🔁 *Tu cita fue reagendada*\n\n"+
			"%s, movimos tu cita de *%s* con *%s*.\n\n"+
			"Fecha anterior:\n"+
			"📅 %s\n\n"+
			"Nueva fecha:\n"+
			"📅 %s\n\n"+
			"¿Confirmas tu asistencia?",
		customerName,
		service.Name,
		resource.Name,
		datetime.FormatTime(payload.PreviousStartsAt, "Monday, 02 de January de 2006 a las 3:04 PM"),
		datetime.FormatTime(payload.StartsAt, "Monday, 02 de January de 2006 a las 3:04 PM"),
	)
	buttons := []whatsapp.Button{
		{Type: "reply", Reply: whatsapp.ButtonReply{ID: "reminder_confirm_" + payload.AppointmentID.String(), Title: "✅ Confirmar"}},
		{Type: "reply", Reply: whatsapp.ButtonReply{ID: "reminder_cancel_" + payload.AppointmentID.String(), Title: "❌ Cancelar"}},
		{Type: "reply", Reply: whatsapp.ButtonReply{ID: "reminder_reschedule_" + payload.AppointmentID.String(), Title: "🔁 Reagendar"}},
	}

	if err := h.whatsapp.SendButtons(ctx, customer.PhoneNumber, waConfig.PhoneNumberID.String, accessToken, body, buttons); err != nil {
		return fault.Wrap(err, fault.Internal("send appointment rescheduled whatsapp notification"))
	}

	return nil
}
