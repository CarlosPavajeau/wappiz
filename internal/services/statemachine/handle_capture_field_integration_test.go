package statemachine

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"wappiz/pkg/whatsapp"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

// confirmingWhatsapp also records the confirmation summary, sent with buttons
// once every field is answered.
type confirmingWhatsapp struct {
	*recordingWhatsapp
}

func (w confirmingWhatsapp) SendButtons(ctx context.Context, to, phoneNumberID, accessToken, body string, _ []whatsapp.Button) error {
	return w.SendText(ctx, to, phoneNumberID, accessToken, body)
}

type captureFixture struct {
	confirmFixture
}

type flowFieldRow struct {
	key       string
	fieldType string
	required  bool
	maxLength int
}

// newCaptureFixture starts the conversation at the first of fields, which are
// asked in the order given.
func newCaptureFixture(t *testing.T, fields ...flowFieldRow) captureFixture {
	t.Helper()
	require.NotEmpty(t, fields)

	first := fields[0].key
	f := newBookingFixture(t, StepCaptureField, func(data *SessionData) {
		data.PendingFlowFieldKey = &first
	})
	f.svc.whatsapp = confirmingWhatsapp{f.whatsapp}
	f.msg.InteractiveID = nil

	for i, field := range fields {
		minLength, maxLength := any(nil), any(nil)
		if field.fieldType == "text" {
			minLength, maxLength = 0, field.maxLength
		}
		_, err := f.database.Primary().ExecContext(context.Background(),
			`INSERT INTO tenant_flow_fields (id, tenant_id, field_key, question, field_type, min_length, max_length, is_required, sort_order)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			uuid.New(), f.msg.TenantID, field.key, "Pregunta "+field.key, field.fieldType, minLength, maxLength, field.required, i)
		require.NoError(t, err)
	}

	return captureFixture{f}
}

func (f captureFixture) send(t *testing.T, body string) string {
	t.Helper()
	msg := f.msg
	msg.Body = body
	require.NoError(t, f.svc.Process(context.Background(), msg))
	sent := f.whatsapp.sent()
	require.NotEmpty(t, sent)
	return sent[len(sent)-1]
}

func (f captureFixture) sessionData(t *testing.T) (SessionStep, SessionData) {
	t.Helper()
	var step string
	var raw []byte
	err := f.database.Primary().QueryRowContext(context.Background(),
		`SELECT step, data FROM conversation_sessions WHERE id = $1`, f.session.ID).Scan(&step, &raw)
	require.NoError(t, err)
	var data SessionData
	require.NoError(t, json.Unmarshal(raw, &data))
	return SessionStep(step), data
}

func TestHandleCaptureField(t *testing.T) {
	t.Parallel()

	t.Run("stores the normalised answer and moves on", func(t *testing.T) {
		t.Parallel()
		f := newCaptureFixture(t,
			flowFieldRow{key: "email", fieldType: "email", required: true},
			flowFieldRow{key: "document", fieldType: "document", required: true},
		)

		reply := f.send(t, "  Ana@Correo.COM ")
		require.Contains(t, reply, "Pregunta document")
		require.Contains(t, reply, "Solo números")

		f.send(t, "1.023.456.789")
		step, data := f.sessionData(t)
		require.Equal(t, StepConfirm, step)
		require.Equal(t, map[string]string{"email": "ana@correo.com", "document": "1023456789"}, data.FlowFieldAnswers)
	})

	t.Run("explains an invalid answer and keeps asking", func(t *testing.T) {
		t.Parallel()
		f := newCaptureFixture(t, flowFieldRow{key: "email", fieldType: "email", required: true})

		reply := f.send(t, "no tengo")
		require.Contains(t, reply, "correo válido")
		require.Contains(t, reply, "Pregunta email")

		step, data := f.sessionData(t)
		require.Equal(t, StepCaptureField, step)
		require.Equal(t, 1, data.FlowFieldAttempts)
		require.Empty(t, data.FlowFieldAnswers)
	})

	t.Run("ends the conversation after repeated invalid required answers", func(t *testing.T) {
		t.Parallel()
		f := newCaptureFixture(t, flowFieldRow{key: "document", fieldType: "document", required: true})

		f.send(t, "abc")
		f.send(t, "omitir")
		reply := f.send(t, "123")

		require.Contains(t, reply, "Escribe *hola*")
		require.False(t, f.sessionExists(t))
	})

	t.Run("skips an optional field after repeated invalid answers", func(t *testing.T) {
		t.Parallel()
		f := newCaptureFixture(t,
			flowFieldRow{key: "email", fieldType: "email"},
			flowFieldRow{key: "reason", fieldType: "text", maxLength: 20},
		)

		f.send(t, "x")
		f.send(t, "y")
		reply := f.send(t, "z")
		require.Contains(t, reply, "Pregunta reason")

		step, data := f.sessionData(t)
		require.Equal(t, StepCaptureField, step)
		require.Equal(t, "", data.FlowFieldAnswers["email"])
		require.Zero(t, data.FlowFieldAttempts)
	})

	t.Run("lets the customer skip an optional field", func(t *testing.T) {
		t.Parallel()
		f := newCaptureFixture(t, flowFieldRow{key: "email", fieldType: "email"})

		f.send(t, "Omitir")
		step, data := f.sessionData(t)
		require.Equal(t, StepConfirm, step)
		require.Contains(t, data.FlowFieldAnswers, "email")
	})

	t.Run("rejects text above the field limit", func(t *testing.T) {
		t.Parallel()
		f := newCaptureFixture(t, flowFieldRow{key: "reason", fieldType: "text", required: true, maxLength: 20})

		reply := f.send(t, strings.Repeat("a", 21))
		require.Contains(t, reply, "máximo 20 caracteres")
	})

	t.Run("does not take media or stale buttons as answers", func(t *testing.T) {
		t.Parallel()
		f := newCaptureFixture(t, flowFieldRow{key: "reason", fieldType: "text", maxLength: 50})

		reply := f.send(t, "")
		require.Contains(t, reply, "mensaje de texto")

		staleButton := "confirm_yes"
		f.msg.InteractiveID = &staleButton
		reply = f.send(t, "Sí, confirmar")
		require.Contains(t, reply, "mensaje de texto")

		_, data := f.sessionData(t)
		require.Empty(t, data.FlowFieldAnswers)
		require.Equal(t, 2, data.FlowFieldAttempts)
	})

	t.Run("refuses messages above the global cap without touching the session", func(t *testing.T) {
		t.Parallel()
		f := newCaptureFixture(t, flowFieldRow{key: "reason", fieldType: "text", maxLength: 1000})

		reply := f.send(t, strings.Repeat("a", maxMessageLength+1))
		require.Contains(t, reply, "muy largo")

		_, data := f.sessionData(t)
		require.Zero(t, data.FlowFieldAttempts)
	})

	t.Run("asks again for a stored one-time answer that no longer validates", func(t *testing.T) {
		t.Parallel()
		f := newCaptureFixture(t, flowFieldRow{key: "email", fieldType: "email", required: true})
		ctx := context.Background()

		_, err := f.database.Primary().ExecContext(ctx,
			`UPDATE tenant_flow_fields SET is_one_time = true WHERE tenant_id = $1`, f.msg.TenantID)
		require.NoError(t, err)

		appointmentID := uuid.New()
		_, err = f.database.Primary().ExecContext(ctx,
			`INSERT INTO appointments (id, tenant_id, resource_id, service_id, customer_id, starts_at, ends_at, price_at_booking)
			 VALUES ($1, $2, $3, $4, $5, now() - interval '2 days', now() - interval '2 days' + interval '30 minutes', 100)`,
			appointmentID, f.msg.TenantID, f.resourceID, f.serviceID, f.session.CustomerID)
		require.NoError(t, err)
		_, err = f.database.Primary().ExecContext(ctx,
			`INSERT INTO appointment_field_responses (id, appointment_id, field_key, response) VALUES ($1, $2, 'email', 'not-an-email')`,
			uuid.New(), appointmentID)
		require.NoError(t, err)

		var sessionData SessionData
		require.NoError(t, f.svc.advanceToFlowFieldsOrConfirm(ctx, f.msg, f.session, sessionData, nil))

		step, data := f.sessionData(t)
		require.Equal(t, StepCaptureField, step)
		require.NotNil(t, data.PendingFlowFieldKey)
		require.Equal(t, "email", *data.PendingFlowFieldKey)
	})
}
