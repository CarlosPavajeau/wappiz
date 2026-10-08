package flowfield

import (
	"database/sql"
	"strings"
	"testing"
	"wappiz/pkg/db"

	"github.com/stretchr/testify/require"
)

func ptr[T any](v T) *T { return &v }

func TestFromSpec(t *testing.T) {
	t.Run("round-trips every type", func(t *testing.T) {
		for _, spec := range []Spec{
			{Type: db.FlowFieldTypeText, MinLength: ptr[int16](0), MaxLength: ptr[int16](280)},
			{Type: db.FlowFieldTypeEmail},
			{Type: db.FlowFieldTypeDocument},
			{Type: db.FlowFieldTypeNumber, MinValue: ptr[int32](1)},
			{Type: db.FlowFieldTypeNumber, MinValue: ptr[int32](1), MaxValue: ptr[int32](5)},
			{Type: db.FlowFieldTypeDate},
			{Type: db.FlowFieldTypePhone},
		} {
			rule, err := FromSpec(spec)
			require.NoError(t, err, spec.Type)
			require.Equal(t, spec, ToSpec(rule))

			fromColumns, err := FromColumns(ToColumns(rule))
			require.NoError(t, err)
			require.Equal(t, rule, fromColumns)
		}
	})

	t.Run("rejects illegal combinations", func(t *testing.T) {
		for name, spec := range map[string]Spec{
			"unknown type":         {Type: "color"},
			"text without limits":  {Type: db.FlowFieldTypeText},
			"text without max":     {Type: db.FlowFieldTypeText, MinLength: ptr[int16](0)},
			"text min above max":   {Type: db.FlowFieldTypeText, MinLength: ptr[int16](10), MaxLength: ptr[int16](5)},
			"text max zero":        {Type: db.FlowFieldTypeText, MinLength: ptr[int16](0), MaxLength: ptr[int16](0)},
			"text max too large":   {Type: db.FlowFieldTypeText, MinLength: ptr[int16](0), MaxLength: ptr[int16](1001)},
			"text negative min":    {Type: db.FlowFieldTypeText, MinLength: ptr[int16](-1), MaxLength: ptr[int16](10)},
			"length on email":      {Type: db.FlowFieldTypeEmail, MaxLength: ptr[int16](10)},
			"value on text":        {Type: db.FlowFieldTypeText, MinLength: ptr[int16](0), MaxLength: ptr[int16](10), MaxValue: ptr[int32](3)},
			"number min above max": {Type: db.FlowFieldTypeNumber, MinValue: ptr[int32](5), MaxValue: ptr[int32](1)},
		} {
			_, err := FromSpec(spec)
			require.Error(t, err, name)
		}
	})
}

func TestFromColumns(t *testing.T) {
	rule, err := FromColumns(Columns{
		Type:      db.FlowFieldTypeText,
		MinLength: sql.NullInt16{Int16: 0, Valid: true},
		MaxLength: sql.NullInt16{Int16: 500, Valid: true},
	})
	require.NoError(t, err)
	require.Equal(t, TextRule{MinLength: 0, MaxLength: 500}, rule)
}

func TestParseQuestion(t *testing.T) {
	got, err := ParseQuestion("  ¿Cuál es tu correo?  ")
	require.NoError(t, err)
	require.Equal(t, "¿Cuál es tu correo?", got)

	_, err = ParseQuestion(" ¿ ")
	require.Error(t, err)
	_, err = ParseQuestion(strings.Repeat("é", MaxQuestionLength+1))
	require.Error(t, err)
}
