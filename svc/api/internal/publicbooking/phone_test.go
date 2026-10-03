package publicbooking

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParsePhoneNumber(t *testing.T) {
	t.Run("normalises formatted Colombian mobiles", func(t *testing.T) {
		for _, raw := range []string{
			"+57 300 123 4567",
			"0057 300-123-4567",
			"57 (300) 123.4567",
			"573001234567",
			"300 123 4567",
			"3001234567",
		} {
			got, err := ParsePhoneNumber(raw)
			require.NoError(t, err, raw)
			require.Equal(t, "573001234567", got, raw)
		}
	})

	t.Run("rejects invalid numbers", func(t *testing.T) {
		for _, raw := range []string{
			"",
			"+",
			"1234567",
			"1234567890123456",
			"57300abc4567",
			"0300 123 4567",
		} {
			_, err := ParsePhoneNumber(raw)
			require.Error(t, err, raw)
		}
	})

	t.Run("rejects non-Colombian and non-mobile numbers", func(t *testing.T) {
		for _, raw := range []string{
			"+52 55 1234 5678",    // Mexico
			"+1 415 555 0123",     // US
			"+3001234567",         // "+30" is Greece, not a national number
			"+57 601 234 5678",    // Bogotá landline
			"6012345678",          // national landline
			"+57 57 300 123 4567", // doubled dial code
			"+57 300 123 456",     // too short
		} {
			_, err := ParsePhoneNumber(raw)
			require.Error(t, err, raw)
		}
	})
}
