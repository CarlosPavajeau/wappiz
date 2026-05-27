package state_machine

import (
	"context"
	"strings"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
)

func (s *service) handleCaptureField(ctx context.Context, msg IncomingMessage, session db.ConversationSession) error {
	sessionData, err := db.UnmarshalNullableJSONTo[SessionData]([]byte(session.Data))
	if err != nil {
		return fault.Wrap(err, fault.Internal("unmarshal session data"))
	}

	fields, err := db.Query.FindTenantEnabledFlowFields(ctx, s.db.Primary(), session.TenantID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("find tenant enabled flow fields"))
	}

	if sessionData.PendingFlowFieldKey == nil {
		return s.advanceToCustomFieldsOrConfirm(ctx, msg, session, sessionData, fields)
	}

	field, found := findCustomFlowField(fields, *sessionData.PendingFlowFieldKey)
	if !found {
		sessionData.PendingFlowFieldKey = nil
		return s.advanceToCustomFieldsOrConfirm(ctx, msg, session, sessionData, fields)
	}

	answer := strings.TrimSpace(msg.Body)
	if answer == "" || strings.EqualFold(answer, "omitir") {
		if field.IsRequired {
			if err := s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
				"Este dato es obligatorio para continuar.\n\n"+flowFieldQuestion(*field)); err != nil {
				return fault.Wrap(err, fault.Internal("send required custom field prompt"))
			}
			return nil
		}
		answer = ""
	}

	if sessionData.FlowFieldAnswers == nil {
		sessionData.FlowFieldAnswers = map[string]string{}
	}
	sessionData.FlowFieldAnswers[field.FieldKey] = answer
	sessionData.PendingFlowFieldKey = nil

	return s.advanceToCustomFieldsOrConfirm(ctx, msg, session, sessionData, fields)
}

func findCustomFlowField(fields []db.FindTenantEnabledFlowFieldsRow, fieldKey string) (*db.FindTenantEnabledFlowFieldsRow, bool) {
	for _, field := range fields {
		if field.FieldType == db.FlowFieldTypeCustom && field.FieldKey == fieldKey {
			return &field, true
		}
	}

	return nil, false
}
