package webhookprocessor

import (
	"context"
	"errors"
	"strconv"
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

func TestIsStale(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	at := func(d time.Duration) string { return strconv.FormatInt(now.Add(d).Unix(), 10) }

	require.False(t, isStale(at(0), now))
	require.False(t, isStale(at(-maxMessageAge), now))
	require.True(t, isStale(at(-maxMessageAge-time.Second), now))
	require.True(t, isStale(at(-48*time.Hour), now))
	// Clock skew can put a message slightly in the future; it is fresh.
	require.False(t, isStale(at(time.Minute), now))

	require.False(t, isStale("", now))
	require.False(t, isStale("not-a-number", now))
}
