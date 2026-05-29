package statemachine

import (
	"context"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"

	"github.com/google/uuid"
)

func (s *service) advanceToCustomFieldsOrConfirm(ctx context.Context, msg IncomingMessage, session db.ConversationSession, sessionData SessionData, fields []db.FindTenantEnabledFlowFieldsRow) error {
	nextField, err := s.nextCustomFlowField(ctx, session.TenantID, sessionData, fields)
	if err != nil {
		return fault.Wrap(err, fault.Internal("find next custom flow field"))
	}
	if nextField == nil {
		sessionData.PendingFlowFieldKey = nil
		session.Step = string(StepConfirm)

		session, err = s.updateSession(ctx, session, sessionData)
		if err != nil {
			return fault.Wrap(err, fault.Internal("update session"))
		}

		return s.sendConfirmation(ctx, msg, session)
	}

	sessionData.PendingFlowFieldKey = &nextField.FieldKey
	session.Step = string(StepCaptureField)

	if _, err = s.updateSession(ctx, session, sessionData); err != nil {
		return fault.Wrap(err, fault.Internal("update session"))
	}

	return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken, flowFieldQuestion(*nextField))
}

func (s *service) nextCustomFlowField(ctx context.Context, tenantID uuid.UUID, sessionData SessionData, fields []db.FindTenantEnabledFlowFieldsRow) (*db.FindTenantEnabledFlowFieldsRow, error) {
	if len(fields) == 0 {
		var err error
		fields, err = db.Query.FindTenantEnabledFlowFields(ctx, s.db.Primary(), tenantID)
		if err != nil {
			return nil, err
		}
	}

	for _, field := range fields {
		if field.FieldType != db.FlowFieldTypeCustom {
			continue
		}
		if _, ok := sessionData.FlowFieldAnswers[field.FieldKey]; ok {
			continue
		}
		return &field, nil
	}

	return nil, nil
}

func flowFieldQuestion(field db.FindTenantEnabledFlowFieldsRow) string {
	question := "Por favor comparte esta información: " + field.FieldKey
	if field.Question.Valid && field.Question.String != "" {
		question = field.Question.String
	}

	if field.IsRequired {
		return question
	}

	return question + "\n\nOpcional: responde *Omitir* si prefieres no compartir este dato."
}
