package flowfield

import (
	"fmt"
	"strings"
	"unicode/utf8"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
)

// Spec is the wire shape of a rule, shared by the dashboard API requests and
// responses. Only the limits of the selected type may be set.
type Spec struct {
	Type      db.FlowFieldType `json:"type"`
	MinLength *int16           `json:"minLength,omitempty"`
	MaxLength *int16           `json:"maxLength,omitempty"`
	MinValue  *int32           `json:"minValue,omitempty"`
	MaxValue  *int32           `json:"maxValue,omitempty"`
}

// FromSpec parses a client-supplied rule; see [FromColumns].
func FromSpec(s Spec) (Rule, error) {
	return FromColumns(Columns{
		Type:      s.Type,
		MinLength: toNullInt16(s.MinLength),
		MaxLength: toNullInt16(s.MaxLength),
		MinValue:  toNullInt32(s.MinValue),
		MaxValue:  toNullInt32(s.MaxValue),
	})
}

func ToSpec(rule Rule) Spec {
	spec := Spec{Type: rule.Type()}
	switch r := rule.(type) {
	case TextRule:
		minLength, maxLength := int16(r.MinLength), int16(r.MaxLength)
		spec.MinLength, spec.MaxLength = &minLength, &maxLength
	case NumberRule:
		spec.MinValue, spec.MaxValue = r.Min, r.Max
	}
	return spec
}

const (
	minQuestionLength = 2
	// MaxQuestionLength keeps a question, its format hint and the "Omitir"
	// note well inside a single WhatsApp message.
	MaxQuestionLength = 500
)

// ParseQuestion trims the question a tenant writes and checks its length in
// characters, matching the tenant_flow_fields question check.
func ParseQuestion(raw string) (string, error) {
	question := strings.TrimSpace(raw)
	length := utf8.RuneCountInString(question)
	if length < minQuestionLength || length > MaxQuestionLength {
		return "", fault.New("invalid flow field question",
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal(fmt.Sprintf("question has %d characters", length)),
			fault.Public(fmt.Sprintf("La pregunta debe tener entre %d y %d caracteres", minQuestionLength, MaxQuestionLength)),
		)
	}
	return question, nil
}
