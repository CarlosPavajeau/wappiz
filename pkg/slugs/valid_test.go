package slugs

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestIsValid(t *testing.T) {
	t.Run("accepts slugify output", func(t *testing.T) {
		for _, slug := range []string{"barber-kings", "salon-x7k2p", "a"} {
			require.True(t, IsValid(slug), slug)
		}
	})

	t.Run("rejects scanner probes", func(t *testing.T) {
		for _, slug := range []string{"robots.txt", ".env", ".env.docker", "wp-login.php", "Admin", "", "a b"} {
			require.False(t, IsValid(slug), slug)
		}
	})

	t.Run("rejects slugs longer than the column", func(t *testing.T) {
		require.True(t, IsValid(strings.Repeat("a", MaxLength)))
		require.False(t, IsValid(strings.Repeat("a", MaxLength+1)))
	})
}
