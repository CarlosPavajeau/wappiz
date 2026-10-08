package statemachine

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
	"unicode/utf8"
	"wappiz/internal/services/booking"
	"wappiz/internal/services/ratelimit"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/logger"
)

func (s *service) Process(ctx context.Context, msg IncomingMessage) error {
	// The body and full phone number are customer data (documents, emails,
	// addresses); only their shape is logged.
	logger.Info("[scheduling] processing message",
		"tenant_id", msg.TenantID,
		"from", maskPhone(msg.From),
		"body_length", utf8.RuneCountInString(msg.Body),
		"interactive_id", msg.InteractiveID)

	if !s.allowSender(ctx, msg) {
		return nil
	}

	customer, err := booking.FindOrCreateCustomer(ctx, s.db.Primary(), msg.TenantID, msg.From)
	if err != nil {
		return err
	}

	if customer.IsBlocked {
		logger.Info("[scheduling] customer is blocked, ignoring message",
			"tenant_id", msg.TenantID,
			"phone_number", maskPhone(msg.From))
		return nil
	}

	if utf8.RuneCountInString(msg.Body) > maxMessageLength {
		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"Tu mensaje es muy largo 😅 Por favor envía una respuesta más corta.")
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

// allowSender drops messages from a phone number flooding the bot. The sender
// is told once per window why the bot went quiet; answering every dropped
// message would let it amplify its own traffic into outbound WhatsApp
// messages. A rate limiter failure lets the message through, since losing a
// customer's booking is worse than a burst.
func (s *service) allowSender(ctx context.Context, msg IncomingMessage) bool {
	identifier := msg.TenantID.String() + ":" + msg.From
	res, err := s.ratelimit.Ratelimit(ctx, ratelimit.RatelimitRequest{
		Name:       "whatsapp-messages-per-sender",
		Identifier: identifier,
		Limit:      senderMessagesPerMinute,
		Duration:   time.Minute,
		Cost:       1,
	})
	if err != nil {
		logger.Warn("[scheduling] sender rate limit check failed, allowing message",
			"tenant_id", msg.TenantID,
			"err", err)
		return true
	}
	if res.Success {
		return true
	}

	logger.Warn("[scheduling] sender rate limited, dropping message",
		"tenant_id", msg.TenantID,
		"from", maskPhone(msg.From))
	s.noticeRateLimited(ctx, msg, identifier)
	return false
}

// noticeRateLimited tells the sender it is being throttled, at most once per
// window. Failing to notify is only logged: the message is dropped either way.
func (s *service) noticeRateLimited(ctx context.Context, msg IncomingMessage, identifier string) {
	notice, err := s.ratelimit.Ratelimit(ctx, ratelimit.RatelimitRequest{
		Name:       "whatsapp-rate-limit-notice-per-sender",
		Identifier: identifier,
		Limit:      1,
		Duration:   time.Minute,
		Cost:       1,
	})
	if err != nil || !notice.Success {
		return
	}

	if err := s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
		"Estás enviando muchos mensajes muy rápido ⏳\n\n"+
			"Espera un minuto y vuelve a escribirnos para continuar."); err != nil {
		logger.Warn("[scheduling] failed to send rate limit notice",
			"tenant_id", msg.TenantID,
			"err", err)
	}
}

// maskPhone keeps the last four digits, enough to correlate log lines with a
// customer without storing the full number.
func maskPhone(phone string) string {
	const visible = 4
	if len(phone) <= visible {
		return strings.Repeat("*", len(phone))
	}
	return strings.Repeat("*", len(phone)-visible) + phone[len(phone)-visible:]
}
