package statemachine

import (
	"context"
	"database/sql"
	"strings"
	"unicode/utf8"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
)

func (s *service) handleAwaitingName(ctx context.Context, msg IncomingMessage, session db.ConversationSession, customer db.FindCustomerByPhoneNumberRow) error {
	name := strings.Join(strings.Fields(msg.Body), " ")
	if length := utf8.RuneCountInString(name); msg.InteractiveID != nil || length < minNameLength || length > maxNameLength {
		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"Por favor escríbenos tu nombre (máximo 100 caracteres) para continuar 😊")
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
	return s.advanceToFlowFieldsOrConfirm(ctx, msg, session, sessionData, nil)
}
