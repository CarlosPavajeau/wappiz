package state_machine

import (
	"context"
	"strings"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"

	"github.com/google/uuid"
)

func (s *service) handleCaptureField(ctx context.Context, msg IncomingMessage, session db.ConversationSession) error {
	sessionData, err := db.UnmarshalNullableJSONTo[SessionData]([]byte(session.Data))
	if err != nil {
		return fault.Wrap(err, fault.Internal("unmarshal session data"))
	}

	if sessionData.PendingFlowFieldKey == nil {
		return s.advanceToCustomFieldsOrConfirm(ctx, msg, session, sessionData)
	}

	field, found, err := s.findEnabledCustomFlowField(ctx, session.TenantID, *sessionData.PendingFlowFieldKey)
	if err != nil {
		return fault.Wrap(err, fault.Internal("find custom flow field"))
	}
	if !found {
		sessionData.PendingFlowFieldKey = nil
		return s.advanceToCustomFieldsOrConfirm(ctx, msg, session, sessionData)
	}

	answer := strings.TrimSpace(msg.Body)
	if answer == "" || strings.EqualFold(answer, "omitir") {
		if field.IsRequired {
			return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
				"Este dato es obligatorio para continuar.\n\n"+flowFieldQuestion(field))
		}
		answer = ""
	}

	if sessionData.FlowFieldAnswers == nil {
		sessionData.FlowFieldAnswers = map[string]string{}
	}
	sessionData.FlowFieldAnswers[field.FieldKey] = answer
	sessionData.PendingFlowFieldKey = nil

	return s.advanceToCustomFieldsOrConfirm(ctx, msg, session, sessionData)
}

func (s *service) findEnabledCustomFlowField(ctx context.Context, tenantID uuid.UUID, fieldKey string) (db.FindTenantEnabledFlowFieldsRow, bool, error) {
	fields, err := db.Query.FindTenantEnabledFlowFields(ctx, s.db.Primary(), tenantID)
	if err != nil {
		return db.FindTenantEnabledFlowFieldsRow{}, false, err
	}

	for _, field := range fields {
		if field.FieldType == db.FlowFieldTypeCustom && field.FieldKey == fieldKey {
			return field, true, nil
		}
	}

	return db.FindTenantEnabledFlowFieldsRow{}, false, nil
}
