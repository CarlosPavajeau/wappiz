package statemachine

import (
	"context"
	"database/sql"
	"strings"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
)

func (s *service) handleAwaitingName(ctx context.Context, msg IncomingMessage, session db.ConversationSession, customer db.FindCustomerByPhoneNumberRow) error {
	name := strings.TrimSpace(msg.Body)
	if len(name) < 2 {
		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"Por favor dinos tu nombre para continuar 😊")
	}

	customer.Name = sql.NullString{String: name, Valid: true}

	if err := db.Query.UpdateCustomer(ctx, s.db.Primary(), db.UpdateCustomerParams{
		Name: customer.Name,
		ID:   customer.ID,
	}); err != nil {
		return fault.Wrap(err, fault.Internal("update customer"))
	}

	sessionData, err := db.UnmarshalNullableJSONTo[SessionData]([]byte(session.Data))
	if err != nil {
		return fault.Wrap(err, fault.Internal("unmarshal session data"))
	}

	sessionData.ConfirmedName = &name
	return s.advanceToCustomFieldsOrConfirm(ctx, msg, session, sessionData, nil)
}
