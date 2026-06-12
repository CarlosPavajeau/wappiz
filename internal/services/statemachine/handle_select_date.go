package statemachine

import (
	"context"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/logger"
)

func (s *service) handleSelectDate(ctx context.Context, msg IncomingMessage, session db.ConversationSession, customer db.FindCustomerByPhoneNumberRow) error {
	sessionData, err := db.UnmarshalNullableJSONTo[SessionData]([]byte(session.Data))
	if err != nil {
		return fault.Wrap(err, fault.Internal("unmarshal session data"))
	}

	if sessionData.DateAttempts >= maxDateAttempts {
		logger.Warn("[scheduling] max date attempts reached, resetting session",
			"session_id", session.ID)

		_ = db.Query.DeleteConversationSession(ctx, s.db.Primary(), session.ID)

		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"Parece que estás teniendo problemas para agendar 😅\n"+
				"Escríbenos cuando quieras e intentamos de nuevo.\n\n"+
				"Escribe *hola* para comenzar.")
	}

	tenant, err := db.Query.FindTenantByID(ctx, s.db.Primary(), session.TenantID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("find tenant by id"))
	}

	result, err := s.validateAndFindSlots(ctx, msg.Body, tenant.Timezone, session)

	if err != nil {
		sessionData.DateAttempts++
		if _, err := s.updateSession(ctx, session, sessionData); err != nil {
			return fault.Wrap(err, fault.Internal("update session"))
		}

		errMsg := buildErrorMessage(err, msg.Body, nil)

		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken, errMsg)
	}

	if !result.SlotTaken {
		sessionData.StartsAt = &result.StartsAt
		if result.ResourceID != nil {
			sessionData.ResourceID = result.ResourceID
		}
		sessionData.DateAttempts = 0

		return s.advanceToConfirmOrName(ctx, msg, session, sessionData, customer)
	}

	if len(result.Slots) == 0 {
		sessionData.DateAttempts++

		if _, err = s.updateSession(ctx, session, sessionData); err != nil {
			return fault.Wrap(err, fault.Internal("update session"))
		}

		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"No encontramos disponibilidad cerca a esa fecha 😔\nPor favor intenta con otra fecha.")
	}

	session.Step = string(StepSelectTime)
	sessionData.DateAttempts = 0

	if _, err = s.updateSession(ctx, session, sessionData); err != nil {
		return fault.Wrap(err, fault.Internal("update session"))
	}

	body := defaultSlotListBody
	if result.DayUnavailable {
		body = "Ese día no hay disponibilidad 📅 Estas son las opciones más cercanas:"
	}

	return s.sendSlotList(ctx, msg, result.Slots, body)
}
