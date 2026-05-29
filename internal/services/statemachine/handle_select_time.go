package statemachine

import (
	"context"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
)

func (s *service) handleSelectTime(ctx context.Context, msg IncomingMessage, session db.ConversationSession, customer db.FindCustomerByPhoneNumberRow) error {
	interactiveID := msg.InteractiveID
	if interactiveID == nil {
		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"Por favor selecciona una de las opciones de la lista 👆")
	}

	startsAt, resourceID, err := parseSlotID(*interactiveID)
	if err != nil {
		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"Por favor selecciona una de las opciones de la lista 👆")
	}

	sessionData, err := db.UnmarshalNullableJSONTo[SessionData]([]byte(session.Data))
	if err != nil {
		return fault.Wrap(err, fault.Internal("unmarshal session data"))
	}

	sessionData.StartsAt = &startsAt
	sessionData.ResourceID = &resourceID

	return s.advanceToConfirmOrName(ctx, msg, session, sessionData, customer)
}
