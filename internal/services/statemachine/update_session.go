package statemachine

import (
	"context"
	"encoding/json"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
)

func (s *service) updateSession(ctx context.Context, session db.ConversationSession, sessionData SessionData) (db.ConversationSession, error) {
	updatedData, err := json.Marshal(sessionData)
	if err != nil {
		return session, fault.Wrap(err, fault.Internal("marshal session data"))
	}

	session.Data = updatedData

	if err := db.Query.UpdateConversationSession(ctx, s.db.Primary(), db.UpdateConversationSessionParams{
		Step:      session.Step,
		Data:      session.Data,
		ExpiresAt: session.ExpiresAt,
		ID:        session.ID,
	}); err != nil {
		return session, fault.Wrap(err, fault.Internal("update session"))
	}

	return session, nil
}
