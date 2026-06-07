package statemachine

import (
	"context"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"

	"github.com/google/uuid"
)

func (s *service) advanceToCustomFieldsOrConfirm(ctx context.Context, msg IncomingMessage, session db.ConversationSession, sessionData SessionData, fields []db.FindTenantEnabledFlowFieldsRow) error {
	nextField, err := s.nextCustomFlowField(ctx, session.TenantID, session.CustomerID, &sessionData, fields)
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

func (s *service) nextCustomFlowField(ctx context.Context, tenantID uuid.UUID, customerID uuid.UUID, sessionData *SessionData, fields []db.FindTenantEnabledFlowFieldsRow) (*db.FindTenantEnabledFlowFieldsRow, error) {
	if len(fields) == 0 {
		var err error
		fields, err = db.Query.FindTenantEnabledFlowFields(ctx, s.db.Primary(), tenantID)
		if err != nil {
			return nil, err
		}
	}

	if err := s.hydrateOneTimeFlowFieldAnswers(ctx, tenantID, customerID, sessionData, fields); err != nil {
		return nil, err
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

func (s *service) hydrateOneTimeFlowFieldAnswers(ctx context.Context, tenantID uuid.UUID, customerID uuid.UUID, sessionData *SessionData, fields []db.FindTenantEnabledFlowFieldsRow) error {
	var fieldKeys []string
	for _, field := range fields {
		if field.FieldType != db.FlowFieldTypeCustom || !field.IsOneTime {
			continue
		}
		if _, ok := sessionData.FlowFieldAnswers[field.FieldKey]; ok {
			continue
		}
		fieldKeys = append(fieldKeys, field.FieldKey)
	}
	if len(fieldKeys) == 0 {
		return nil
	}

	answers, err := db.Query.FindLatestOneTimeFlowFieldAnswers(ctx, s.db.Primary(), db.FindLatestOneTimeFlowFieldAnswersParams{
		TenantID:   tenantID,
		CustomerID: customerID,
		FieldKeys:  fieldKeys,
	})
	if err != nil {
		return err
	}
	if len(answers) == 0 {
		return nil
	}

	if sessionData.FlowFieldAnswers == nil {
		sessionData.FlowFieldAnswers = map[string]string{}
	}
	for _, answer := range answers {
		if answer.Response == "" {
			continue
		}
		sessionData.FlowFieldAnswers[answer.FieldKey] = answer.Response
	}

	return nil
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
