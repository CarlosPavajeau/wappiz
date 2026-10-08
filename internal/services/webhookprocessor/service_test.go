package webhookprocessor

import (
	"context"
	"errors"
	"testing"
	"time"
	"wappiz/pkg/clock"
	"wappiz/pkg/counter"

	"github.com/stretchr/testify/require"
)

// failingCounter simulates the shared store being unreachable.
type failingCounter struct{ counter.Counter }

func (failingCounter) SetIfNotExists(context.Context, string, int64, ...time.Duration) (bool, error) {
	return false, errors.New("redis down")
}

func TestClaimMessage(t *testing.T) {
	t.Run("processes a message once", func(t *testing.T) {
		s := &service{seenMessages: counter.NewMemoryCounter(clock.New())}
		ctx := context.Background()

		require.True(t, s.claimMessage(ctx, "phone-1", "wamid.A"))
		require.False(t, s.claimMessage(ctx, "phone-1", "wamid.A"))
		require.True(t, s.claimMessage(ctx, "phone-1", "wamid.B"))
		require.True(t, s.claimMessage(ctx, "phone-2", "wamid.A"))
	})

	t.Run("lets the message through when it cannot be deduplicated", func(t *testing.T) {
		s := &service{seenMessages: failingCounter{}}
		ctx := context.Background()

		require.True(t, s.claimMessage(ctx, "phone-1", "wamid.A"))
		require.True(t, s.claimMessage(ctx, "phone-1", "wamid.A"))

		s.seenMessages = counter.NewMemoryCounter(clock.New())
		require.True(t, s.claimMessage(ctx, "phone-1", ""))
		require.True(t, s.claimMessage(ctx, "phone-1", ""))
	})
}
