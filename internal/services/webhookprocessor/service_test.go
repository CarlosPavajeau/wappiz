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

func newMemoryCounter(t *testing.T) *counter.MemoryCounter {
	t.Helper()
	c := counter.NewMemoryCounter(clock.New())
	t.Cleanup(func() { require.NoError(t, c.Close()) })
	return c
}

func TestClaimMessage(t *testing.T) {
	t.Run("processes a message once", func(t *testing.T) {
		s := &service{seenMessages: newMemoryCounter(t)}
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

		s.seenMessages = newMemoryCounter(t)
		require.True(t, s.claimMessage(ctx, "phone-1", ""))
		require.True(t, s.claimMessage(ctx, "phone-1", ""))
	})
}

// deadlineAwareCounter fails like Redis does when the context is done; the
// in-memory counter ignores the context.
type deadlineAwareCounter struct{ *counter.MemoryCounter }

func (c deadlineAwareCounter) Delete(ctx context.Context, key string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	return c.MemoryCounter.Delete(ctx, key)
}

func TestReleaseMessage(t *testing.T) {
	t.Run("lets a redelivery of a failed message through", func(t *testing.T) {
		s := &service{seenMessages: newMemoryCounter(t)}
		ctx := context.Background()

		require.True(t, s.claimMessage(ctx, "phone-1", "wamid.A"))
		s.releaseMessage(ctx, "phone-1", "wamid.A")
		require.True(t, s.claimMessage(ctx, "phone-1", "wamid.A"))
		require.False(t, s.claimMessage(ctx, "phone-1", "wamid.A"))
	})

	t.Run("works after the payload deadline expired", func(t *testing.T) {
		s := &service{seenMessages: deadlineAwareCounter{newMemoryCounter(t)}}
		ctx, cancel := context.WithCancel(context.Background())

		require.True(t, s.claimMessage(ctx, "phone-1", "wamid.A"))
		cancel()
		s.releaseMessage(ctx, "phone-1", "wamid.A")
		require.True(t, s.claimMessage(context.Background(), "phone-1", "wamid.A"))
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
