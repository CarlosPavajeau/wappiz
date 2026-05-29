package state_machine

import (
	"context"
	"fmt"
	"strings"
	"wappiz/pkg/datetime"
	"wappiz/pkg/db"
	"wappiz/pkg/logger"
	"wappiz/pkg/whatsapp"

	"github.com/google/uuid"
)

func (s *service) handleCancelConfirm(ctx context.Context, msg IncomingMessage, customer db.FindCustomerByPhoneNumberRow) error {
	appointmentID, err := uuid.Parse(strings.TrimPrefix(*msg.InteractiveID, "cancel_"))
	if err != nil {
		logger.Warn("[scheduling] failed to parse interactive id from cancel confirmation",
			"interactive_id", *msg.InteractiveID,
			"err", err)

		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"Ocurrió un error. Por favor intenta de nuevo.")
	}

	appointment, err := db.Query.FindAppointmentByID(ctx, s.db.Primary(), db.FindAppointmentByIDParams{
		ID:       appointmentID,
		TenantID: msg.TenantID,
	})

	if err != nil {
		logger.Warn("[scheduling] failed to find appointment for cancel confirmation",
			"appointment_id", appointmentID,
			"err", err)
		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"No encontramos esa cita. Por favor intenta de nuevo.")
	}

	if appointment.CustomerID != customer.ID {
		logger.Warn("[scheduling] appointment does not belong to customer for cancel confirmation",
			"appointment_id", appointmentID,
			"customer_id", customer.ID)
		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"No encontramos esa cita. Por favor intenta de nuevo.")
	}

	svc, err := db.Query.FindServiceByID(ctx, s.db.Primary(), appointment.ServiceID)
	if err != nil {
		logger.Warn("[scheduling] failed to find service for cancel confirmation",
			"appointment_id", appointmentID,
			"service_id", appointment.ServiceID,
			"err", err)
		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"Ocurrió un error. Por favor intenta de nuevo.")
	}

	rsc, err := db.Query.FindResourceById(ctx, s.db.Primary(), appointment.ResourceID)
	if err != nil {
		logger.Warn("[scheduling] failed to find resource for cancel confirmation",
			"appointment_id", appointmentID,
			"resource_id", appointment.ResourceID,
			"err", err)
		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"Ocurrió un error. Por favor intenta de nuevo.")
	}

	body := fmt.Sprintf(
		"¿Confirmas la cancelación de esta cita? 🗓️\n\n"+
			"%s con %s\n"+
			"📅 %s\n\n"+
			"Esta acción no se puede deshacer.",
		svc.Name, rsc.Name,
		datetime.FormatTime(appointment.StartsAt, "02/01/2006 03:04 PM"),
	)
	buttons := []whatsapp.Button{
		{Type: "reply", Reply: whatsapp.ButtonReply{ID: "confirm_cancel_" + appointmentID.String(), Title: "✅ Sí, cancelar"}},
		{Type: "reply", Reply: whatsapp.ButtonReply{ID: "action_keep", Title: "🔙 No, mantener"}},
	}

	return s.whatsapp.SendButtons(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken, body, buttons)
}
