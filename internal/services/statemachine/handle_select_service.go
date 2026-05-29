package statemachine

import (
	"context"
	"time"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/logger"
)

func (s *service) handleSelectService(ctx context.Context, msg IncomingMessage, session db.ConversationSession) error {
	svc, err := s.validateService(ctx, msg.TenantID, msg.InteractiveID)
	if err != nil {
		return s.sendServiceList(ctx, msg)
	}

	sessionData, err := db.UnmarshalNullableJSONTo[SessionData]([]byte(session.Data))
	if err != nil {
		logger.Warn("[scheduling] failed to unmarshal session data on select service step",
			"session_id", session.ID,
			"err", err)
		return s.sendServiceList(ctx, msg)
	}

	sessionData.ServiceID = &svc.ID
	session.Step = string(StepSelectResource)
	session.ExpiresAt = time.Now().Add(sessionTTL)

	session, err = s.updateSession(ctx, session, sessionData)
	if err != nil {
		return fault.Wrap(err, fault.Internal("update session"))
	}

	rsc, err := db.Query.FindResourcesByServiceID(ctx, s.db.Primary(), db.FindResourcesByServiceIDParams{
		TenantID:  session.TenantID,
		ServiceID: svc.ID,
	})

	if err != nil {
		return fault.Wrap(err, fault.Internal("find resources"))
	}

	if len(rsc) == 1 {
		sessionData.ResourceID = &rsc[0].ID
		session.Step = string(StepSelectDate)

		session, err = s.updateSession(ctx, session, sessionData)
		if err != nil {
			return fault.Wrap(err, fault.Internal("update session"))
		}

		return s.sendDatePrompt(ctx, msg)
	}

	return s.sendResourceList(ctx, msg, rsc)
}
