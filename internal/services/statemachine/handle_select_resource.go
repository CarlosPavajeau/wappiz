package statemachine

import (
	"context"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/logger"

	"github.com/google/uuid"
)

func (s *service) handleSelectResource(ctx context.Context, msg IncomingMessage, session db.ConversationSession) error {
	interactiveID := msg.InteractiveID

	sessionData, err := db.UnmarshalNullableJSONTo[SessionData]([]byte(session.Data))
	if err != nil {
		logger.Warn("[scheduling] failed to unmarshal session data on select resource step",
			"session_id", session.ID,
			"err", err)
		return s.sendServiceList(ctx, msg)
	}

	if interactiveID == nil {
		rsc, err := db.Query.FindResourcesByServiceID(ctx, s.db.Primary(), db.FindResourcesByServiceIDParams{
			TenantID:  session.TenantID,
			ServiceID: *sessionData.ServiceID,
		})
		if err != nil {
			return fault.Wrap(err, fault.Internal("find resources by service id"))
		}
		return s.sendResourceList(ctx, msg, rsc)
	}

	var resourceID *uuid.UUID
	if *interactiveID == "resource_any" {
		resourceID = nil
	} else {
		id, err := uuid.Parse(*interactiveID)
		if err != nil {
			rsc, err := db.Query.FindResourcesByServiceID(ctx, s.db.Primary(), db.FindResourcesByServiceIDParams{
				TenantID:  session.TenantID,
				ServiceID: *sessionData.ServiceID,
			})
			if err != nil {
				return fault.Wrap(err, fault.Internal("find resources by service id"))
			}
			return s.sendResourceList(ctx, msg, rsc)
		}
		resourceID = &id
	}

	sessionData.ResourceID = resourceID
	session.Step = string(StepSelectDate)

	if _, err := s.updateSession(ctx, session, sessionData); err != nil {
		return fault.Wrap(err, fault.Internal("update session"))
	}

	return s.sendDatePrompt(ctx, msg)
}
