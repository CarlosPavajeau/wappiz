package statemachine

import (
	"context"
	"encoding/json"
	"strings"
	"time"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/logger"

	"github.com/google/uuid"
)

const (
	reminderConfirmPrefix    = "reminder_confirm_"
	reminderCancelPrefix     = "reminder_cancel_"
	reminderReschedulePrefix = "reminder_reschedule_"
)

type reminderAction struct {
	kind          reminderActionKind
	appointmentID uuid.UUID
}

type reminderActionKind string

const (
	reminderActionConfirm    reminderActionKind = "confirm"
	reminderActionCancel     reminderActionKind = "cancel"
	reminderActionReschedule reminderActionKind = "reschedule"
)

func (s *service) handleReminderAction(ctx context.Context, msg IncomingMessage, customer db.FindCustomerByPhoneNumberRow) error {
	action, ok := parseReminderAction(msg.InteractiveID)
	if !ok {
		logger.Warn("[scheduling] invalid reminder action",
			"tenant_id", msg.TenantID,
			"interactive_id", msg.InteractiveID)
		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"Ocurrió un error. Por favor intenta de nuevo.")
	}

	appointment, err := db.Query.FindAppointmentByID(ctx, s.db.Primary(), db.FindAppointmentByIDParams{
		ID:       action.appointmentID,
		TenantID: msg.TenantID,
	})
	if err != nil {
		logger.Warn("[scheduling] failed to find appointment for reminder action",
			"appointment_id", action.appointmentID,
			"err", err)
		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"No encontramos esa cita. Por favor intenta de nuevo.")
	}

	if appointment.CustomerID != customer.ID {
		logger.Warn("[scheduling] appointment does not belong to customer for reminder action",
			"appointment_id", action.appointmentID,
			"customer_id", customer.ID)
		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"No encontramos esa cita. Por favor intenta de nuevo.")
	}

	if appointment.Status != db.AppointmentStatusConfirmed {
		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"Esta cita ya no está activa. Escríbenos si necesitas ayuda.")
	}

	switch action.kind {
	case reminderActionConfirm:
		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"✅ Perfecto, tu cita sigue confirmada. Te esperamos.")

	case reminderActionCancel:
		interactiveID := "cancel_" + action.appointmentID.String()
		msg.InteractiveID = &interactiveID
		return s.handleCancelConfirm(ctx, msg, customer)

	case reminderActionReschedule:
		data, err := json.Marshal(SessionData{
			RescheduleAppointmentID: &action.appointmentID,
			ServiceID:               &appointment.ServiceID,
			ResourceID:              &appointment.ResourceID,
		})
		if err != nil {
			return fault.Wrap(err, fault.Internal("marshal reschedule session data"))
		}

		if err := db.Query.InsertConversationSession(ctx, s.db.Primary(), db.InsertConversationSessionParams{
			ID:               uuid.New(),
			TenantID:         msg.TenantID,
			WhatsappConfigID: msg.WhatsappConfigID,
			CustomerID:       customer.ID,
			Step:             string(StepSelectDate),
			Data:             data,
			ExpiresAt:        time.Now().Add(sessionTTL),
		}); err != nil {
			return fault.Wrap(err, fault.Internal("create reschedule session"))
		}

		if err := s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"Claro, vamos a reagendar tu cita."); err != nil {
			return fault.Wrap(err, fault.Internal("send reschedule intro"))
		}

		return s.sendDatePrompt(ctx, msg)
	}

	return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
		"Ocurrió un error. Por favor intenta de nuevo.")
}

func parseReminderAction(interactiveID *string) (reminderAction, bool) {
	if interactiveID == nil {
		return reminderAction{}, false
	}

	prefixes := []struct {
		prefix string
		kind   reminderActionKind
	}{
		{prefix: reminderConfirmPrefix, kind: reminderActionConfirm},
		{prefix: reminderCancelPrefix, kind: reminderActionCancel},
		{prefix: reminderReschedulePrefix, kind: reminderActionReschedule},
	}

	for _, candidate := range prefixes {
		if !strings.HasPrefix(*interactiveID, candidate.prefix) {
			continue
		}

		appointmentID, err := uuid.Parse(strings.TrimPrefix(*interactiveID, candidate.prefix))
		if err != nil {
			return reminderAction{}, false
		}

		return reminderAction{
			kind:          candidate.kind,
			appointmentID: appointmentID,
		}, true
	}

	return reminderAction{}, false
}
