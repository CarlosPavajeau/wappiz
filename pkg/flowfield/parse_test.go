package flowfield

import (
	"strings"
	"testing"
	"time"
	"wappiz/pkg/codes"
	"wappiz/pkg/fault"

	"github.com/stretchr/testify/require"
)

func requireRejected(t *testing.T, rule Rule, answer string) {
	t.Helper()
	_, err := rule.Parse(answer)
	require.Error(t, err, answer)
	code, ok := fault.GetCode(err)
	require.True(t, ok)
	require.Equal(t, codes.AppErrorsInvalidFormat, code)
	require.NotEmpty(t, fault.UserFacingMessage(err))
}

func TestTextRule(t *testing.T) {
	rule := TextRule{MinLength: 3, MaxLength: 10}

	t.Run("collapses whitespace and strips invisible characters", func(t *testing.T) {
		got, err := rule.Parse("hola\n\t  mundo​\x07")
		require.NoError(t, err)
		require.Equal(t, "hola mundo", got)
	})

	t.Run("counts characters, not bytes", func(t *testing.T) {
		got, err := rule.Parse("ñandú café")
		require.NoError(t, err)
		require.Equal(t, "ñandú café", got)
	})

	t.Run("rejects answers outside the limits", func(t *testing.T) {
		requireRejected(t, rule, "ab")
		requireRejected(t, rule, "abcdefghijk")
		requireRejected(t, rule, "​​")
		requireRejected(t, TextRule{MinLength: 0, MaxLength: 1000}, strings.Repeat("a", 1001))
	})
}

func TestEmailRule(t *testing.T) {
	t.Run("normalises to lowercase", func(t *testing.T) {
		got, err := EmailRule{}.Parse("Ana.Perez@Correo.COM")
		require.NoError(t, err)
		require.Equal(t, "ana.perez@correo.com", got)
	})

	t.Run("rejects malformed addresses", func(t *testing.T) {
		for _, answer := range []string{
			"ana",
			"ana@",
			"@correo.com",
			"ana@correo",
			"ana@correo.",
			"Ana <ana@correo.com>",
			"ana @correo.com",
			strings.Repeat("a", 250) + "@x.co",
		} {
			requireRejected(t, EmailRule{}, answer)
		}
	})
}

func TestDocumentRule(t *testing.T) {
	t.Run("drops separators", func(t *testing.T) {
		for answer, want := range map[string]string{
			"1.023.456.789": "1023456789",
			"1023 456 789":  "1023456789",
			"80-123-456":    "80123456",
			"12345":         "12345",
		} {
			got, err := DocumentRule{}.Parse(answer)
			require.NoError(t, err, answer)
			require.Equal(t, want, got)
		}
	})

	t.Run("rejects letters and bad lengths", func(t *testing.T) {
		for _, answer := range []string{"1234", "1234567890123456", "CC 1023456", "１２３４５６"} {
			requireRejected(t, DocumentRule{}, answer)
		}
	})
}

func TestNumberRule(t *testing.T) {
	low, high := int32(1), int32(10)
	rule := NumberRule{Min: &low, Max: &high}

	t.Run("canonicalises accepted numbers", func(t *testing.T) {
		got, err := rule.Parse("+07")
		require.NoError(t, err)
		require.Equal(t, "7", got)
	})

	t.Run("rejects out of range and non integers", func(t *testing.T) {
		for _, answer := range []string{"0", "11", "5.5", "cinco", "99999999999999999999"} {
			requireRejected(t, rule, answer)
		}
	})

	t.Run("unbounded accepts any integer", func(t *testing.T) {
		got, err := NumberRule{}.Parse("-42")
		require.NoError(t, err)
		require.Equal(t, "-42", got)
	})
}

func TestDateRule(t *testing.T) {
	t.Run("accepts day-first dates with any separator", func(t *testing.T) {
		for _, answer := range []string{"05/03/1990", "5/3/1990", "5-3-1990", "05.03.1990"} {
			got, err := DateRule{}.Parse(answer)
			require.NoError(t, err, answer)
			require.Equal(t, "1990-03-05", got)
		}
	})

	t.Run("accepts today", func(t *testing.T) {
		today := time.Now().UTC()
		got, err := DateRule{}.Parse(today.Format("02/01/2006"))
		require.NoError(t, err)
		require.Equal(t, today.Format(StoredDateLayout), got)
	})

	t.Run("rejects impossible, future or pre-1900 dates", func(t *testing.T) {
		dayAfterTomorrow := time.Now().UTC().AddDate(0, 0, 2).Format("02/01/2006")
		for _, answer := range []string{"31/02/2000", "1990-03-05", "05/03/90", "31/12/1899", dayAfterTomorrow, "ayer"} {
			requireRejected(t, DateRule{}, answer)
		}
	})
}

func TestPhoneRule(t *testing.T) {
	got, err := PhoneRule{}.Parse("300 123 4567")
	require.NoError(t, err)
	require.Equal(t, "573001234567", got)

	requireRejected(t, PhoneRule{}, "12345")
}
