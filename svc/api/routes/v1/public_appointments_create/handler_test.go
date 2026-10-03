package public_appointments_create

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParseCustomerName(t *testing.T) {
	t.Run("collapses whitespace", func(t *testing.T) {
		got, err := parseCustomerName("  José   Pérez \n")
		require.NoError(t, err)
		require.Equal(t, "José Pérez", got)
	})

	t.Run("rejects too short and too long names", func(t *testing.T) {
		for _, raw := range []string{"", "  ", "A", strings.Repeat("ñ", 101)} {
			_, err := parseCustomerName(raw)
			require.Error(t, err)
		}
	})
}
