package statemachine

import (
	"context"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
)

// handleTargetUnavailableOnConfirm ends a booking whose resource or service
// was deleted while the customer was confirming. The session is dropped
// because every later step would hit the same deleted row, leaving the
// customer stuck until it expired.
func (s *service) handleTargetUnavailableOnConfirm(ctx context.Context, msg IncomingMessage, session db.ConversationSession) error {
	if err := db.Query.DeleteConversationSession(ctx, s.db.Primary(), session.ID); err != nil {
		return fault.Wrap(err, fault.Internal("delete session after target became unavailable"))
	}

	if err := s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
		"Lo sentimos, el servicio o profesional que elegiste ya no está disponible 😔\n"+
			"Escríbenos para agendar con otra opción."); err != nil {
		return fault.Wrap(err, fault.Internal("send target unavailable message"))
	}

	return nil
}
