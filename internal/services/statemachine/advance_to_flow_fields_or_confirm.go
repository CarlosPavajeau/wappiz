package statemachine

import (
	"context"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/flowfield"
	"wappiz/pkg/logger"

	"github.com/google/uuid"
)

func (s *service) advanceToFlowFieldsOrConfirm(ctx context.Context, msg IncomingMessage, session db.ConversationSession, sessionData SessionData, fields []db.FindTenantEnabledFlowFieldsRow) error {
	// Attempts are counted per question; moving on starts the next one fresh.
	sessionData.FlowFieldAttempts = 0

	nextField, err := s.nextFlowField(ctx, session.TenantID, session.CustomerID, &sessionData, fields)
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

	rule, err := flowFieldRule(*nextField)
	if err != nil {
		return err
	}

	sessionData.PendingFlowFieldKey = &nextField.FieldKey
	session.Step = string(StepCaptureField)

	if _, err = s.updateSession(ctx, session, sessionData); err != nil {
		return fault.Wrap(err, fault.Internal("update session"))
	}

	return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken, flowFieldQuestion(*nextField, rule))
}

func (s *service) nextFlowField(ctx context.Context, tenantID uuid.UUID, customerID uuid.UUID, sessionData *SessionData, fields []db.FindTenantEnabledFlowFieldsRow) (*db.FindTenantEnabledFlowFieldsRow, error) {
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
		if _, ok := sessionData.FlowFieldAnswers[field.FieldKey]; ok {
			continue
		}
		return &field, nil
	}

	return nil, nil
}

func (s *service) hydrateOneTimeFlowFieldAnswers(ctx context.Context, tenantID uuid.UUID, customerID uuid.UUID, sessionData *SessionData, fields []db.FindTenantEnabledFlowFieldsRow) error {
	var fieldKeys []string
	rules := map[string]flowfield.Rule{}
	for _, field := range fields {
		if !field.IsOneTime {
			continue
		}
		if _, ok := sessionData.FlowFieldAnswers[field.FieldKey]; ok {
			continue
		}
		rule, err := flowFieldRule(field)
		if err != nil {
			return err
		}
		fieldKeys = append(fieldKeys, field.FieldKey)
		rules[field.FieldKey] = rule
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
		rule, ok := rules[answer.FieldKey]
		if !ok || answer.Response == "" {
			continue
		}
		// The tenant may have tightened the field since this answer was given
		// (or it predates validation); such answers are asked again.
		normalized, err := rule.Parse(answer.Response)
		if err != nil {
			logger.Info("[scheduling] stored one-time answer no longer valid, asking again",
				"field_key", answer.FieldKey)
			continue
		}
		sessionData.FlowFieldAnswers[answer.FieldKey] = normalized
	}

	return nil
}

func flowFieldQuestion(field db.FindTenantEnabledFlowFieldsRow, rule flowfield.Rule) string {
	question := field.Question + "\n_" + rule.Hint() + "_"
	if field.IsRequired {
		return question
	}

	return question + "\n\nOpcional: responde *Omitir* si prefieres no compartir este dato."
}
