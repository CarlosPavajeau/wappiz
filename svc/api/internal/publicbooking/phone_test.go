package publicbooking

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParsePhoneNumber(t *testing.T) {
	t.Run("normalises formatted numbers", func(t *testing.T) {
		for _, raw := range []string{
			"+57 300 123 4567",
			"0057 300-123-4567",
			"57 (300) 123.4567",
			"573001234567",
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
}
