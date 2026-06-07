package statemachine

import (
	"context"
	"database/sql"
	"strings"
	"wappiz/internal/events"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/logger"

	"github.com/google/uuid"
)

func (s *service) handleCancelExecute(ctx context.Context, msg IncomingMessage, customer db.FindCustomerByPhoneNumberRow) error {
	appointmentID, err := uuid.Parse(strings.TrimPrefix(*msg.InteractiveID, "confirm_cancel_"))
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

	evt, evtErr := events.NewAppointmentCanceled(events.AppointmentCanceledPayload{
		AppointmentID: appointment.ID,
		TenantID:      appointment.TenantID,
		CustomerID:    appointment.CustomerID,
		ServiceID:     appointment.ServiceID,
		ResourceID:    appointment.ResourceID,
		StartsAt:      appointment.StartsAt,
		EndsAt:        appointment.EndsAt,
	})
	if evtErr != nil {
		return fault.Wrap(evtErr, fault.Internal("build appointment.canceled event"))
	}

	err = db.Tx(ctx, s.db.Primary(), func(ctx context.Context, txx db.DBTX) error {
		if err := db.Query.UpdateAppointment(ctx, txx, db.UpdateAppointmentParams{
			Status:       db.AppointmentStatusCancelled,
			CancelledBy:  sql.NullString{},
			CancelReason: sql.NullString{String: "Cancelado por el cliente", Valid: true},
			CompletedAt:  sql.NullTime{},
			ID:           appointmentID,
		}); err != nil {
			return err
		}

		if err := db.Query.InsertAppointmentStatusHistory(ctx, txx, db.InsertAppointmentStatusHistoryParams{
			ID:            uuid.New(),
			AppointmentID: appointmentID,
			FromStatus:    appointment.Status,
			ToStatus:      db.AppointmentStatusCancelled,
			ChangedBy:     sql.NullString{Valid: false},
			ChangedByRole: sql.NullString{Valid: false},
			Reason:        sql.NullString{String: "Cancelado por el cliente", Valid: true},
		}); err != nil {
			return err
		}

		return s.publisher.Publish(ctx, txx, evt)
	})
	if err != nil {
		logger.Warn("[scheduling] failed to update appointment status to cancelled",
			"appointment_id", appointmentID,
			"err", err)
		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"Ocurrió un error al cancelar. Por favor intenta de nuevo.")
	}

	return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
		"✅ Tu cita ha sido cancelada. Si deseas agendar una nueva cita, no dudes en escribirnos.")
}
