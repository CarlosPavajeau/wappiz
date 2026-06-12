package statemachine

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"math"
	"time"
	"wappiz/internal/events"
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

		appointmentLimit, err := s.findAppointmentLimit(ctx, tenant.ID)
		if err != nil {
			return fault.Wrap(err, fault.Internal("find appointment limit"))
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

		evt, evtErr := events.NewAppointmentCreated(events.AppointmentCreatedPayload{
			AppointmentID: appointmentID,
			TenantID:      tenant.ID,
			CustomerID:    session.CustomerID,
			ServiceID:     *sessionData.ServiceID,
			ResourceID:    *sessionData.ResourceID,
			StartsAt:      startsAt,
			EndsAt:        endsAt,
		})
		if evtErr != nil {
			return fault.Wrap(evtErr, fault.Internal("build appointment.created event"))
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

			return s.publisher.Publish(ctx, txx, evt)
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

func (s *service) findAppointmentLimit(ctx context.Context, tenantID uuid.UUID) (sql.NullInt32, error) {
	plan, err := db.Query.FindActivePlanByTenant(ctx, s.db.Primary(), db.FindActivePlanByTenantParams{
		TenantID:    tenantID,
		Environment: s.environment,
	})

	limit, limitErr := appointmentLimitFromInt(freePlanLimit)
	if limitErr != nil {
		return sql.NullInt32{}, limitErr
	}

	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return sql.NullInt32{}, fault.Wrap(err, fault.Internal("find active plan by tenant"))
		}
		// No active plan — apply free plan limit.
	} else {
		features, err := db.UnmarshalNullableJSONTo[db.PlanFeatures]([]byte(plan.Features))
		if err != nil {
			return sql.NullInt32{}, fault.Wrap(err, fault.Internal("unmarshal plan features"))
		}

		if features.MaxAppointmentsPerMonth == nil {
			return sql.NullInt32{}, nil
		}

		limit, limitErr = appointmentLimitFromInt(*features.MaxAppointmentsPerMonth)
		if limitErr != nil {
			return sql.NullInt32{}, limitErr
		}
	}

	return limit, nil
}

func appointmentLimitFromInt(limit int) (sql.NullInt32, error) {
	if limit < 0 || limit > math.MaxInt32 {
		return sql.NullInt32{}, fault.New("invalid appointment limit",
			fault.Internal("appointment limit outside int32 range"),
		)
	}

	return sql.NullInt32{Int32: int32(limit), Valid: true}, nil
}
