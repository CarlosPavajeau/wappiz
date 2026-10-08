package statemachine

import (
	"context"
	"strings"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/flowfield"
	"wappiz/pkg/logger"
)

const skipKeyword = "omitir"

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
		return s.advanceToFlowFieldsOrConfirm(ctx, msg, session, sessionData, fields)
	}

	field, found := findFlowField(fields, *sessionData.PendingFlowFieldKey)
	if !found {
		sessionData.PendingFlowFieldKey = nil
		return s.advanceToFlowFieldsOrConfirm(ctx, msg, session, sessionData, fields)
	}

	rule, err := flowFieldRule(*field)
	if err != nil {
		return err
	}

	answer, rejection := parseFlowFieldAnswer(msg, *field, rule)
	if rejection != "" {
		return s.rejectFlowFieldAnswer(ctx, msg, session, sessionData, fields, *field, rule, rejection)
	}

	return s.acceptFlowFieldAnswer(ctx, msg, session, sessionData, fields, *field, answer)
}

// parseFlowFieldAnswer returns the value to store, or the reason the answer
// was rejected. An empty value means an optional field the customer skipped.
// Button and list replies, and media (which arrive with an empty body), are
// never an answer: they are leftovers from earlier steps or unreadable here.
func parseFlowFieldAnswer(msg IncomingMessage, field db.FindTenantEnabledFlowFieldsRow, rule flowfield.Rule) (string, string) {
	answer := strings.TrimSpace(msg.Body)
	if msg.InteractiveID != nil || answer == "" {
		return "", "Por favor responde escribiendo un mensaje de texto."
	}

	if strings.EqualFold(answer, skipKeyword) {
		if field.IsRequired {
			return "", "Este dato es obligatorio para continuar."
		}
		return "", ""
	}

	normalized, err := rule.Parse(answer)
	if err != nil {
		return "", fault.UserFacingMessage(err)
	}
	return normalized, ""
}

func (s *service) acceptFlowFieldAnswer(ctx context.Context, msg IncomingMessage, session db.ConversationSession, sessionData SessionData, fields []db.FindTenantEnabledFlowFieldsRow, field db.FindTenantEnabledFlowFieldsRow, answer string) error {
	if sessionData.FlowFieldAnswers == nil {
		sessionData.FlowFieldAnswers = map[string]string{}
	}
	sessionData.FlowFieldAnswers[field.FieldKey] = answer
	sessionData.PendingFlowFieldKey = nil

	return s.advanceToFlowFieldsOrConfirm(ctx, msg, session, sessionData, fields)
}

// rejectFlowFieldAnswer explains the problem and asks again. After
// maxFlowFieldAttempts an optional field is skipped so the booking can go on;
// a required one ends the conversation, since retrying forever would only
// keep a confused customer, or a script, looping on the bot.
func (s *service) rejectFlowFieldAnswer(ctx context.Context, msg IncomingMessage, session db.ConversationSession, sessionData SessionData, fields []db.FindTenantEnabledFlowFieldsRow, field db.FindTenantEnabledFlowFieldsRow, rule flowfield.Rule, rejection string) error {
	sessionData.FlowFieldAttempts++
	if sessionData.FlowFieldAttempts < maxFlowFieldAttempts {
		if _, err := s.updateSession(ctx, session, sessionData); err != nil {
			return fault.Wrap(err, fault.Internal("update session"))
		}
		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			rejection+"\n\n"+flowFieldQuestion(field, rule))
	}

	logger.Warn("[scheduling] max flow field attempts reached",
		"session_id", session.ID,
		"field_key", field.FieldKey,
		"required", field.IsRequired)

	if !field.IsRequired {
		if err := s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"No pudimos validar este dato, así que lo omitiremos por ahora 👍"); err != nil {
			return fault.Wrap(err, fault.Internal("send skipped flow field notice"))
		}
		return s.acceptFlowFieldAnswer(ctx, msg, session, sessionData, fields, field, "")
	}

	if err := db.Query.DeleteConversationSession(ctx, s.db.Primary(), session.ID); err != nil {
		return fault.Wrap(err, fault.Internal("delete conversation session"))
	}

	return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
		"No pudimos validar este dato y es necesario para agendar 😔\n\n"+
			"Escribe *hola* cuando quieras intentarlo de nuevo.")
}

func findFlowField(fields []db.FindTenantEnabledFlowFieldsRow, fieldKey string) (*db.FindTenantEnabledFlowFieldsRow, bool) {
	for _, field := range fields {
		if field.FieldKey == fieldKey {
			return &field, true
		}
	}

	return nil, false
}

func flowFieldRule(field db.FindTenantEnabledFlowFieldsRow) (flowfield.Rule, error) {
	rule, err := flowfield.FromColumns(flowfield.Columns{
		Type:      field.FieldType,
		MinLength: field.MinLength,
		MaxLength: field.MaxLength,
		MinValue:  field.MinValue,
		MaxValue:  field.MaxValue,
	})
	if err != nil {
		return nil, fault.Wrap(err, fault.Internal("stored flow field rule is invalid: "+field.FieldKey))
	}
	return rule, nil
}
