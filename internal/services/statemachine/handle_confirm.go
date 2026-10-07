package statemachine

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"
	"wappiz/internal/events"
	"wappiz/internal/services/booking"
	"wappiz/internal/services/slotfinder"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/logger"

	"github.com/google/uuid"
)

func (s *service) handleConfirm(ctx context.Context, msg IncomingMessage, session db.ConversationSession, customer db.FindCustomerByPhoneNumberRow) error {
	interactiveID := msg.InteractiveID
	if interactiveID == nil {
		return s.sendConfirmation(ctx, msg, session)
	}

	sessionData, err := db.UnmarshalNullableJSONTo[SessionData]([]byte(session.Data))
	if err != nil {
		return fault.Wrap(err, fault.Internal("unmarshal session data"))
	}

	switch *interactiveID {
	case "confirm_yes":
		tenant, err := db.Query.FindTenantByID(ctx, s.db.Primary(), session.TenantID)
		if err != nil {
			return fault.Wrap(err, fault.Internal("find tenant by id"))
		}

		appointmentLimit, err := s.plans.AppointmentLimit(ctx, tenant.ID)
		if err != nil {
			return fault.Wrap(err, fault.Internal("find appointment limit"))
		}

		svc, err := db.Query.FindServiceByID(ctx, s.db.Primary(), *sessionData.ServiceID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return s.handleTargetUnavailableOnConfirm(ctx, msg, session)
			}
			return fault.Wrap(err, fault.Internal("find service by id"))
		}

		startsAt := *sessionData.StartsAt
		endsAt := startsAt.Add(time.Duration(svc.DurationMinutes) * time.Minute)
		appointmentID := uuid.New()
		if sessionData.RescheduleAppointmentID != nil {
			appointmentID = *sessionData.RescheduleAppointmentID
		}

		hasCustomerOverlap, err := s.hasCustomerOverlap(ctx, tenant.ID, session.CustomerID, startsAt, endsAt)
		if err != nil {
			return fault.Wrap(err, fault.Internal("check customer overlap"))
		}
		if hasCustomerOverlap {
			logger.Warn("[scheduling] customer overlap detected on confirm, informing customer",
				"session_id", session.ID,
				"customer_id", session.CustomerID)
			return s.handleOverlapOnConfirm(ctx, msg, session, sessionData, svc)
		}

		// Re-check the schedule at confirm time: an override may have been
		// created between slot selection and confirmation.
		loc, err := time.LoadLocation(tenant.Timezone)
		if err != nil {
			return fault.Wrap(err, fault.Internal("load tenant timezone"))
		}
		bookable, err := s.slotFinder.IsBookable(ctx, slotfinder.IsBookableParams{
			ResourceID: *sessionData.ResourceID,
			StartsAt:   startsAt.In(loc),
			EndsAt:     endsAt.In(loc),
		})
		if err != nil {
			return fault.Wrap(err, fault.Internal("check resource schedule on confirm"))
		}
		if !bookable {
			logger.Warn("[scheduling] slot became unavailable on confirm, informing customer",
				"session_id", session.ID,
				"resource_id", *sessionData.ResourceID)
			return s.handleOverlapOnConfirm(ctx, msg, session, sessionData, svc)
		}

		rescheduledAppointment, err := s.findRescheduledAppointment(ctx, session, sessionData)
		if err != nil {
			return err
		}

		err = db.Tx(ctx, s.db.Primary(), func(ctx context.Context, txx db.DBTX) error {
			// The checks above ran outside this transaction; the lock makes a
			// deletion committed since then fail the write instead of leaving
			// an appointment on a deleted resource or service.
			if err := booking.LockTargets(ctx, txx, tenant.ID, *sessionData.ResourceID, *sessionData.ServiceID); err != nil {
				return err
			}

			if sessionData.RescheduleAppointmentID == nil {
				if err := db.Query.InsertAppointment(ctx, txx, db.InsertAppointmentParams{
					ID:             appointmentID,
					TenantID:       tenant.ID,
					ResourceID:     *sessionData.ResourceID,
					ServiceID:      *sessionData.ServiceID,
					CustomerID:     session.CustomerID,
					StartsAt:       startsAt,
					EndsAt:         endsAt,
					PriceAtBooking: svc.Price,
				}); err != nil {
					return err
				}
			} else {
				updated, err := db.Query.RescheduleAppointment(ctx, txx, db.RescheduleAppointmentParams{
					StartsAt:   startsAt,
					EndsAt:     endsAt,
					ID:         appointmentID,
					TenantID:   tenant.ID,
					CustomerID: session.CustomerID,
				})
				if err != nil {
					return err
				}
				if updated == 0 {
					return fault.New("appointment not rescheduled",
						fault.Internal("confirmed appointment not found for reschedule"),
						fault.Public("No pudimos reagendar esta cita. Por favor intenta de nuevo."),
					)
				}

				evt, evtErr := events.NewAppointmentRescheduled(events.AppointmentRescheduledPayload{
					AppointmentID:    appointmentID,
					TenantID:         tenant.ID,
					CustomerID:       session.CustomerID,
					ServiceID:        *sessionData.ServiceID,
					ResourceID:       *sessionData.ResourceID,
					PreviousStartsAt: rescheduledAppointment.StartsAt,
					PreviousEndsAt:   rescheduledAppointment.EndsAt,
					StartsAt:         startsAt,
					EndsAt:           endsAt,
					RescheduledBy:    events.AppointmentRescheduledByCustomer,
				})
				if evtErr != nil {
					return fault.Wrap(evtErr, fault.Internal("build appointment.rescheduled event"))
				}

				return s.publisher.Publish(ctx, txx, evt)
			}

			if err := recordFlowFieldResponses(ctx, txx, appointmentID, sessionData.FlowFieldAnswers); err != nil {
				return err
			}

			if sessionData.RescheduleAppointmentID != nil {
				return nil
			}

			updated, err := db.Query.IncrementTenantAppointmentCount(ctx, txx, db.IncrementTenantAppointmentCountParams{
				ID:                      tenant.ID,
				MaxAppointmentsPerMonth: appointmentLimit,
			})

			if err != nil {
				return err
			}

			if updated == 0 {
				return fault.New("plan limit reached",
					fault.Code(codes.AppErrorsPlanLimitReached),
					fault.Internal("plan limit reached"), fault.Public("Límite de citas alcanzado"),
				)
			}

			evt, evtErr := events.NewAppointmentCreated(events.AppointmentCreatedPayload{
				AppointmentID: appointmentID,
				TenantID:      tenant.ID,
				CustomerID:    session.CustomerID,
				ServiceID:     *sessionData.ServiceID,
				ResourceID:    *sessionData.ResourceID,
				StartsAt:      startsAt,
				EndsAt:        endsAt,
				Source:        events.AppointmentCreatedSourceBot,
			})
			if evtErr != nil {
				return fault.Wrap(evtErr, fault.Internal("build appointment.created event"))
			}

			return s.publisher.Publish(ctx, txx, evt)
		})
		if err != nil {
			if errors.Is(err, booking.ErrTargetDeleted) {
				return s.handleTargetUnavailableOnConfirm(ctx, msg, session)
			}
			if isAppointmentOverlapConstraintError(err) {
				logger.Warn("[scheduling] appointment overlap detected on confirm, informing customer",
					"session_id", session.ID,
					"err", err)
				return s.handleOverlapOnConfirm(ctx, msg, session, sessionData, svc)
			}
			return fault.Wrap(err, fault.Internal("confirm appointment transaction"))
		}

		if err := db.Query.DeleteConversationSession(ctx, s.db.Primary(), session.ID); err != nil {
			logger.Warn("[scheduling] failed to delete session after confirming appointment",
				"session_id", session.ID,
				"err", err)
		}

		return s.sendAppointmentConfirmed(ctx, msg, appointmentID, customer)

	case "confirm_modify":
		if err := db.Query.DeleteConversationSession(ctx, s.db.Primary(), session.ID); err != nil {
			return fault.Wrap(err, fault.Internal("delete session after confirm_modify"))
		}

		sessionID := uuid.New()
		if err := db.Query.InsertConversationSession(ctx, s.db.Primary(), db.InsertConversationSessionParams{
			ID:               sessionID,
			TenantID:         msg.TenantID,
			WhatsappConfigID: msg.WhatsappConfigID,
			CustomerID:       customer.ID,
			Step:             string(StepSelectService),
			Data:             json.RawMessage("{}"),
			ExpiresAt:        time.Now().Add(sessionTTL),
		}); err != nil {
			return fault.Wrap(err, fault.Internal("create session"))
		}

		return s.sendServiceList(ctx, msg)

	case "confirm_cancel":
		if err := db.Query.DeleteConversationSession(ctx, s.db.Primary(), session.ID); err != nil {
			return fault.Wrap(err, fault.Internal("delete session after confirm_cancel"))
		}

		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"Entendido, hemos cancelado el proceso 👋\nEscríbenos cuando quieras agendar.")
	}

	return s.sendConfirmation(ctx, msg, session)
}

func (s *service) findRescheduledAppointment(
	ctx context.Context,
	session db.ConversationSession,
	sessionData SessionData,
) (db.FindAppointmentByIDRow, error) {
	if sessionData.RescheduleAppointmentID == nil {
		return db.FindAppointmentByIDRow{}, nil
	}

	appointment, err := db.Query.FindAppointmentByID(ctx, s.db.Primary(), db.FindAppointmentByIDParams{
		ID:       *sessionData.RescheduleAppointmentID,
		TenantID: session.TenantID,
	})
	if err != nil {
		return db.FindAppointmentByIDRow{}, fault.Wrap(err, fault.Internal("find appointment for reschedule"))
	}

	if appointment.CustomerID != session.CustomerID {
		return db.FindAppointmentByIDRow{}, fault.New("appointment customer mismatch",
			fault.Internal("appointment does not belong to reschedule session customer"),
			fault.Public("No pudimos reagendar esta cita. Por favor intenta de nuevo."),
		)
	}

	if appointment.Status != db.AppointmentStatusConfirmed {
		return db.FindAppointmentByIDRow{}, fault.New("appointment not confirmed",
			fault.Internal("appointment is not confirmed for reschedule"),
			fault.Public("No pudimos reagendar esta cita. Por favor intenta de nuevo."),
		)
	}

	return appointment, nil
}
