package slugs

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestIsReserved(t *testing.T) {
	t.Run("app routes are reserved", func(t *testing.T) {
		for _, slug := range []string{"dashboard", "sign-in", "privacy", "api"} {
			require.True(t, IsReserved(slug), slug)
		}
	})

	t.Run("business names are not reserved", func(t *testing.T) {
		require.False(t, IsReserved("barber-kings"))
	})
}
