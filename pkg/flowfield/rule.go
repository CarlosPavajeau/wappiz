// Package flowfield validates and normalises the answers customers give to a
// tenant's flow fields. A field's type and limits are stored as loose columns;
// [FromColumns] and [FromSpec] parse them once at the boundary into a [Rule],
// so the bot and the API never handle a combination the database would reject.
package flowfield

import (
	"database/sql"
	"fmt"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
)

const (
	// MaxTextLength bounds what a tenant may allow for a text answer. It matches
	// the appointment_field_responses length check, so any accepted answer fits.
	MaxTextLength = 1000
	// DefaultTextMaxLength is suggested to tenants for open questions: enough
	// for a short explanation, too little to flood the agenda.
	DefaultTextMaxLength = 280
)

// Rule is the validation attached to a flow field. The set of implementations
// is closed; switch on the concrete type to read type-specific limits.
type Rule interface {
	// Type is the database enum value the rule is stored as.
	Type() db.FlowFieldType
	// Hint tells the customer what format is expected, appended to the
	// question. Empty when the question alone is clear enough.
	Hint() string
	// Parse validates a trimmed, non-empty answer and returns its canonical
	// form. A rejected answer returns an [codes.AppErrorsInvalidFormat] fault
	// whose public message explains the problem to the customer.
	Parse(answer string) (string, error)

	isRule()
}

// TextRule accepts free text whose length, in characters, is within bounds.
type TextRule struct {
	MinLength int
	MaxLength int
}

type EmailRule struct{}

// DocumentRule accepts an identity document number of 5 to 15 digits; dots,
// spaces and dashes the customer types as separators are dropped.
type DocumentRule struct{}

// NumberRule accepts an integer, optionally bounded on either side.
type NumberRule struct {
	Min *int32
	Max *int32
}

// DateRule accepts a calendar date written day first (DD/MM/AAAA).
type DateRule struct{}

// PhoneRule accepts a Colombian mobile number, stored as WhatsApp reports it.
type PhoneRule struct{}

func (TextRule) isRule()     {}
func (EmailRule) isRule()    {}
func (DocumentRule) isRule() {}
func (NumberRule) isRule()   {}
func (DateRule) isRule()     {}
func (PhoneRule) isRule()    {}

func (TextRule) Type() db.FlowFieldType     { return db.FlowFieldTypeText }
func (EmailRule) Type() db.FlowFieldType    { return db.FlowFieldTypeEmail }
func (DocumentRule) Type() db.FlowFieldType { return db.FlowFieldTypeDocument }
func (NumberRule) Type() db.FlowFieldType   { return db.FlowFieldTypeNumber }
func (DateRule) Type() db.FlowFieldType     { return db.FlowFieldTypeDate }
func (PhoneRule) Type() db.FlowFieldType    { return db.FlowFieldTypePhone }

// Columns are a rule as stored in tenant_flow_fields.
type Columns struct {
	Type      db.FlowFieldType
	MinLength sql.NullInt16
	MaxLength sql.NullInt16
	MinValue  sql.NullInt32
	MaxValue  sql.NullInt32
}

// FromColumns rebuilds the rule stored for a field. It rejects combinations
// the table checks forbid, so a corrupt row surfaces as an error rather than
// as a field that accepts anything.
func FromColumns(c Columns) (Rule, error) {
	if c.Type != db.FlowFieldTypeText && (c.MinLength.Valid || c.MaxLength.Valid) {
		return nil, invalidRule("length limits only apply to text fields")
	}
	if c.Type != db.FlowFieldTypeNumber && (c.MinValue.Valid || c.MaxValue.Valid) {
		return nil, invalidRule("value limits only apply to number fields")
	}

	switch c.Type {
	case db.FlowFieldTypeText:
		if !c.MinLength.Valid || !c.MaxLength.Valid {
			return nil, invalidRule("text fields need both length limits")
		}
		return newTextRule(int(c.MinLength.Int16), int(c.MaxLength.Int16))
	case db.FlowFieldTypeEmail:
		return EmailRule{}, nil
	case db.FlowFieldTypeDocument:
		return DocumentRule{}, nil
	case db.FlowFieldTypeNumber:
		return newNumberRule(nullableInt32(c.MinValue), nullableInt32(c.MaxValue))
	case db.FlowFieldTypeDate:
		return DateRule{}, nil
	case db.FlowFieldTypePhone:
		return PhoneRule{}, nil
	default:
		return nil, invalidRule(fmt.Sprintf("unknown field type %q", c.Type))
	}
}

// ToColumns is the inverse of [FromColumns].
func ToColumns(rule Rule) Columns {
	columns := Columns{Type: rule.Type()}
	switch r := rule.(type) {
	case TextRule:
		columns.MinLength = sql.NullInt16{Int16: int16(r.MinLength), Valid: true}
		columns.MaxLength = sql.NullInt16{Int16: int16(r.MaxLength), Valid: true}
	case NumberRule:
		columns.MinValue = toNullInt32(r.Min)
		columns.MaxValue = toNullInt32(r.Max)
	}
	return columns
}

func newTextRule(minLength, maxLength int) (Rule, error) {
	if minLength < 0 || maxLength < 1 || maxLength > MaxTextLength || minLength > maxLength {
		return nil, invalidRule(fmt.Sprintf(
			"text length limits must satisfy 0 <= min <= max <= %d and max >= 1", MaxTextLength))
	}
	return TextRule{MinLength: minLength, MaxLength: maxLength}, nil
}

func newNumberRule(minValue, maxValue *int32) (Rule, error) {
	if minValue != nil && maxValue != nil && *minValue > *maxValue {
		return nil, invalidRule("number minimum must not exceed maximum")
	}
	return NumberRule{Min: minValue, Max: maxValue}, nil
}

func nullableInt32(v sql.NullInt32) *int32 {
	if !v.Valid {
		return nil
	}
	return &v.Int32
}

func toNullInt32(v *int32) sql.NullInt32 {
	if v == nil {
		return sql.NullInt32{}
	}
	return sql.NullInt32{Int32: *v, Valid: true}
}

func invalidRule(reason string) error {
	return fault.New("invalid flow field rule",
		fault.Code(codes.ErrorsBadRequest),
		fault.Internal(reason),
		fault.Public("La validación del campo es inválida"),
	)
}

func invalidAnswer(reason, public string) error {
	return fault.New("invalid flow field answer",
		fault.Code(codes.AppErrorsInvalidFormat),
		fault.Internal(reason),
		fault.Public(public),
	)
}

func toNullInt16(v *int16) sql.NullInt16 {
	if v == nil {
		return sql.NullInt16{}
	}
	return sql.NullInt16{Int16: *v, Valid: true}
}
