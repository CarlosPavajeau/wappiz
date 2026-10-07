package featureflags

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestNew(t *testing.T) {
	t.Run("without api key every flag is disabled", func(t *testing.T) {
		flags, err := New(Config{})
		require.NoError(t, err)

		require.False(t, flags.IsEnabled(context.Background(), Billing, uuid.New()))
		require.NoError(t, flags.Close())
	})
}
