package statemachine

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/logger"

	"github.com/google/uuid"
)

func (s *service) Process(ctx context.Context, msg IncomingMessage) error {
	logger.Info("[scheduling] processing message",
		"tenant_id", msg.TenantID,
		"from", msg.From,
		"body", msg.Body,
		"interactive_id", msg.InteractiveID)

	customer, err := db.Query.FindCustomerByPhoneNumber(ctx, s.db.Primary(), db.FindCustomerByPhoneNumberParams{
		TenantID:    msg.TenantID,
		PhoneNumber: msg.From,
	})
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return fault.Wrap(err, fault.Internal("find customer by phone number"))
		}

		logger.Info("[scheduling] customer not found, creating new one",
			"tenant_id", msg.TenantID,
			"phone_number", msg.From)

		if err := db.Query.InsertCustomer(ctx, s.db.Primary(), db.InsertCustomerParams{
			ID:          uuid.New(),
			TenantID:    msg.TenantID,
			PhoneNumber: msg.From,
		}); err != nil {
			return fault.Wrap(err, fault.Internal("insert customer"))
		}

		customer, err = db.Query.FindCustomerByPhoneNumber(ctx, s.db.Primary(), db.FindCustomerByPhoneNumberParams{
			TenantID:    msg.TenantID,
			PhoneNumber: msg.From,
		})
		if err != nil {
			return fault.Wrap(err, fault.Internal("find newly created customer"))
		}
	}

	if customer.IsBlocked {
		logger.Info("[scheduling] customer is blocked, ignoring message",
			"tenant_id", msg.TenantID,
			"phone_number", msg.From)
		return nil
	}

	if handled, err := s.handleGlobalInteractiveAction(ctx, msg, customer); handled || err != nil {
		return err
	}

	session, err := db.Query.FindCustomerActiveConversationSession(ctx, s.db.Primary(), db.FindCustomerActiveConversationSessionParams{
		TenantID:   msg.TenantID,
		CustomerID: customer.ID,
	})

	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return fault.Wrap(err, fault.Internal("find active conversation session"))
		}
		return s.handleEntry(ctx, msg, customer)
	}

	switch SessionStep(session.Step) {
	case StepSelectService:
		return s.handleSelectService(ctx, msg, session)

	case StepSelectResource:
		return s.handleSelectResource(ctx, msg, session)

	case StepSelectDate:
		return s.handleSelectDate(ctx, msg, session, customer)

	case StepSelectTime:
		return s.handleSelectTime(ctx, msg, session, customer)

	case StepAwaitingName:
		return s.handleAwaitingName(ctx, msg, session, customer)

	case StepCaptureField:
		return s.handleCaptureField(ctx, msg, session)

	case StepConfirm:
		return s.handleConfirm(ctx, msg, session, customer)

	default:
		logger.Warn("[scheduling] unknown step "+session.Step+" resetting to entry",
			"session_id", session.ID)

		if err := db.Query.DeleteConversationSession(ctx, s.db.Primary(), session.ID); err != nil {
			logger.Warn("[scheduling] failed to delete session with unknown step, resetting to entry",
				"session_id", session.ID,
				"err", err)

		}

		return s.handleEntry(ctx, msg, customer)
	}
}

func (s *service) handleGlobalInteractiveAction(ctx context.Context, msg IncomingMessage, customer db.FindCustomerByPhoneNumberRow) (bool, error) {
	if msg.InteractiveID == nil {
		return false, nil
	}

	interactiveID := *msg.InteractiveID
	switch {
	case strings.HasPrefix(interactiveID, "reminder_"):
		return true, s.handleReminderAction(ctx, msg, customer)

	case strings.HasPrefix(interactiveID, "cancel_"):
		return true, s.handleCancelConfirm(ctx, msg, customer)

	case strings.HasPrefix(interactiveID, "confirm_cancel_"):
		return true, s.handleCancelExecute(ctx, msg, customer)

	case interactiveID == "action_keep":
		return true, s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"👍 Perfecto, tu cita sigue agendada. ¿Hay algo más en lo que pueda ayudarte?")
	}

	return false, nil
}
