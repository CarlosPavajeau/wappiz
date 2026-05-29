package statemachine

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"
	"wappiz/pkg/db"
	apperrors "wappiz/pkg/errors"
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

		limited, err := s.isAppointmentLimitReached(ctx, tenant.ID, tenant.AppointmentsThisMonth)
		if err != nil {
			return fault.Wrap(err, fault.Internal("check appointment limit"))
		}
		if limited {
			// TODO: Send limit reached notification
			return apperrors.ErrPlanLimitReached
		}

		svc, err := db.Query.FindServiceByID(ctx, s.db.Primary(), *sessionData.ServiceID)
		if err != nil {
			return fault.Wrap(err, fault.Internal("find service by id"))
		}

		startsAt := *sessionData.StartsAt
		endsAt := startsAt.Add(time.Duration(svc.DurationMinutes) * time.Minute)
		appointmentID := uuid.New()

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

		err = db.Tx(ctx, s.db.Primary(), func(ctx context.Context, txx db.DBTX) error {
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

			if err := recordFlowFieldResponses(ctx, txx, appointmentID, sessionData.FlowFieldAnswers); err != nil {
				return err
			}

			if err := db.Query.UpdateTenantAppointmentCount(ctx, txx, db.UpdateTenantAppointmentCountParams{
				ID:                    tenant.ID,
				AppointmentsThisMonth: tenant.AppointmentsThisMonth + 1,
			}); err != nil {
				return err
			}

			return nil
		})
		if err != nil {
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

func (s *service) isAppointmentLimitReached(ctx context.Context, tenantID uuid.UUID, appointmentsThisMonth int32) (bool, error) {
	plan, err := db.Query.FindActivePlanByTenant(ctx, s.db.Primary(), db.FindActivePlanByTenantParams{
		TenantID:    tenantID,
		Environment: s.environment,
	})

	var limit int32 = freePlanLimit

	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return false, fault.Wrap(err, fault.Internal("find active plan by tenant"))
		}
		// No active plan — apply free plan limit.
	} else {
		features, err := db.UnmarshalNullableJSONTo[db.PlanFeatures]([]byte(plan.Features))
		if err != nil {
			return false, fault.Wrap(err, fault.Internal("unmarshal plan features"))
		}

		if features.MaxAppointmentsPerMonth == nil {
			return false, nil
		}

		limit = int32(*features.MaxAppointmentsPerMonth)
	}

	return appointmentsThisMonth >= limit, nil
}
