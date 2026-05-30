package statemachine

import (
	"context"
	"wappiz/internal/services/slotfinder"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
)

func (s *service) handleOverlapOnConfirm(
	ctx context.Context,
	msg IncomingMessage,
	session db.ConversationSession,
	sessionData SessionData,
	svc db.Service,
) error {
	suggestions, err := s.slotFinder.GetSuggestedSlots(ctx, slotfinder.GetSuggestedSlotsParams{
		ResourceID: *sessionData.ResourceID,
		From:       *sessionData.StartsAt,
		Service: slotfinder.ServiceParam{
			DurationMinutes: svc.DurationMinutes,
			BufferMinutes:   svc.BufferMinutes,
		},
	})
	if err != nil {
		return fault.Wrap(err, fault.Internal("get suggested slots"))
	}

	filteredSuggestions := s.filterSlotsByCustomerAvailability(ctx, session.TenantID, session.CustomerID, suggestions)

	overlapErr := fault.New("appointment overlap", fault.Code(codes.AppErrorsAppointmentOverlap))
	errMsg := buildErrorMessage(overlapErr, "", filteredSuggestions)
	if err := s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken, errMsg); err != nil {
		return fault.Wrap(err, fault.Internal("send overlap message"))
	}

	if len(filteredSuggestions) == 0 {
		session.Step = string(StepSelectDate)
		if _, err = s.updateSession(ctx, session, sessionData); err != nil {
			return fault.Wrap(err, fault.Internal("update session"))
		}
		return nil
	}

	session.Step = string(StepSelectTime)
	if _, err = s.updateSession(ctx, session, sessionData); err != nil {
		return fault.Wrap(err, fault.Internal("update session"))
	}

	return s.sendSlotList(ctx, msg, filteredSuggestions)
}
