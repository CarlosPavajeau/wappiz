package webhookprocessor

import (
	"context"
	"errors"
	"strconv"
	"testing"
	"time"
	"wappiz/pkg/buffer"
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

func TestEnqueue(t *testing.T) {
	t.Run("routes a sender's messages to one shard in arrival order", func(t *testing.T) {
		const shards = 4
		s := &service{shards: make([]*buffer.Buffer[job], shards)}
		for i := range s.shards {
			s.shards[i] = buffer.New[job](buffer.Config{Name: "test_" + strconv.Itoa(i), Capacity: 10})
			t.Cleanup(s.shards[i].Close)
		}

		metadata := Metadata{PhoneNumberID: "phone-1"}
		s.Enqueue(Request{Entry: []Entry{{Changes: []Change{
			{Field: "statuses", Value: ChangeValue{Metadata: metadata, Messages: []Message{{ID: "ignored", From: "a"}}}},
			{Field: "messages", Value: ChangeValue{Metadata: metadata, Messages: []Message{
				{ID: "1", From: "a"}, {ID: "2", From: "b"}, {ID: "3", From: "a"},
			}}},
			{Field: "messages", Value: ChangeValue{Metadata: metadata, Messages: []Message{{ID: "4", From: "a"}}}},
		}}}})

		shard := s.shards[shardIndex("phone-1", "a", shards)]
		var ids []string
		for shard.Size() > 0 {
			if j := <-shard.Consume(); j.msg.From == "a" {
				ids = append(ids, j.msg.ID)
			}
		}
		require.Equal(t, []string{"1", "3", "4"}, ids)
	})

	t.Run("spreads senders across shards", func(t *testing.T) {
		used := map[int]bool{}
		for i := range 100 {
			idx := shardIndex("phone-1", "57300"+strconv.Itoa(i), 4)
			require.Equal(t, idx, shardIndex("phone-1", "57300"+strconv.Itoa(i), 4))
			used[idx] = true
		}
		require.Len(t, used, 4)
	})
}

func TestLockSender(t *testing.T) {
	t.Run("excludes a second holder until released", func(t *testing.T) {
		s := &service{senderLocks: newMemoryCounter(t), lockWait: time.Second}

		unlock := s.lockSender("phone-1", "a")
		acquired := make(chan struct{})
		go func() {
			s.lockSender("phone-1", "a")()
			close(acquired)
		}()

		select {
		case <-acquired:
			t.Fatal("second holder acquired a held lock")
		case <-time.After(3 * senderLockPoll):
		}

		unlock()
		select {
		case <-acquired:
		case <-time.After(time.Second):
			t.Fatal("second holder never acquired the released lock")
		}
	})

	t.Run("does not block other senders", func(t *testing.T) {
		s := &service{senderLocks: newMemoryCounter(t), lockWait: time.Second}

		defer s.lockSender("phone-1", "a")()
		start := time.Now()
		s.lockSender("phone-1", "b")()
		require.Less(t, time.Since(start), senderLockPoll)
	})

	t.Run("proceeds unlocked after waiting too long", func(t *testing.T) {
		locks := newMemoryCounter(t)
		s := &service{senderLocks: locks, lockWait: 2 * senderLockPoll}

		s.lockSender("phone-1", "a")
		s.lockSender("phone-1", "a")()

		held, err := locks.Get(context.Background(), senderLockKey("phone-1", "a"))
		require.NoError(t, err)
		require.NotZero(t, held, "a lock that was never acquired must not be released")
	})

	t.Run("does not release a lock taken after its own expired", func(t *testing.T) {
		locks := newMemoryCounter(t)
		s := &service{senderLocks: locks, lockWait: time.Second}
		key := senderLockKey("phone-1", "a")

		unlock := s.lockSender("phone-1", "a")
		// Simulate expiry and another instance taking the lock.
		require.NoError(t, locks.Delete(context.Background(), key))
		other := s.lockSender("phone-1", "a")

		unlock()
		held, err := locks.Get(context.Background(), key)
		require.NoError(t, err)
		require.NotZero(t, held, "the stale holder released the new holder's lock")

		other()
		held, err = locks.Get(context.Background(), key)
		require.NoError(t, err)
		require.Zero(t, held)
	})

	t.Run("proceeds unlocked when the store fails", func(t *testing.T) {
		s := &service{senderLocks: failingCounter{}, lockWait: time.Second}

		start := time.Now()
		s.lockSender("phone-1", "a")()
		require.Less(t, time.Since(start), senderLockPoll)
	})
}
