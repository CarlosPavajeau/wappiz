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

func TestStatic(t *testing.T) {
	ctx := context.Background()

	t.Run("listed flags are enabled for every tenant", func(t *testing.T) {
		flags := Static(Billing)
		require.True(t, flags.IsEnabled(ctx, Billing, uuid.New()))
		require.True(t, flags.IsEnabled(ctx, Billing, uuid.New()))
	})

	t.Run("no flags means everything is disabled", func(t *testing.T) {
		require.False(t, Static().IsEnabled(ctx, Billing, uuid.New()))
	})
}
