package counter_test

import (
	"context"
	"sync"
	"testing"
	"time"
	"wappiz/pkg/clock"
	"wappiz/pkg/counter"

	"github.com/stretchr/testify/require"
)

func newCounter(t *testing.T) (*counter.MemoryCounter, *clock.TestClock) {
	t.Helper()
	clk := clock.NewTestClock(time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC))
	c := counter.NewMemoryCounter(clk)
	t.Cleanup(func() { _ = c.Close() })
	return c, clk
}

func TestIncrement(t *testing.T) {
	ctx := context.Background()

	t.Run("creates key on first increment", func(t *testing.T) {
		c, _ := newCounter(t)
		v, err := c.Increment(ctx, "k", 3)
		require.NoError(t, err)
		require.Equal(t, int64(3), v)
	})

	t.Run("accumulates subsequent increments", func(t *testing.T) {
		c, _ := newCounter(t)
		_, _ = c.Increment(ctx, "k", 3)
		v, err := c.Increment(ctx, "k", 2)
		require.NoError(t, err)
		require.Equal(t, int64(5), v)
	})

	t.Run("resets expired key", func(t *testing.T) {
		c, clk := newCounter(t)
		_, _ = c.Increment(ctx, "k", 10, time.Minute)
		clk.Tick(2 * time.Minute)
		v, err := c.Increment(ctx, "k", 1)
		require.NoError(t, err)
		require.Equal(t, int64(1), v)
	})
}

func TestGet(t *testing.T) {
	ctx := context.Background()

	t.Run("returns 0 for missing key", func(t *testing.T) {
		c, _ := newCounter(t)
		v, err := c.Get(ctx, "missing")
		require.NoError(t, err)
		require.Equal(t, int64(0), v)
	})

	t.Run("returns current value", func(t *testing.T) {
		c, _ := newCounter(t)
		_, _ = c.Increment(ctx, "k", 7)
		v, err := c.Get(ctx, "k")
		require.NoError(t, err)
		require.Equal(t, int64(7), v)
	})

	t.Run("returns 0 for expired key", func(t *testing.T) {
		c, clk := newCounter(t)
		_, _ = c.Increment(ctx, "k", 7, time.Minute)
		clk.Tick(2 * time.Minute)
		v, err := c.Get(ctx, "k")
		require.NoError(t, err)
		require.Equal(t, int64(0), v)
	})
}

func TestMultiGet(t *testing.T) {
	ctx := context.Background()
	c, clk := newCounter(t)

	_, _ = c.Increment(ctx, "a", 1)
	_, _ = c.Increment(ctx, "b", 2, time.Minute)
	_, _ = c.Increment(ctx, "c", 3, time.Hour)
	clk.Tick(30 * time.Minute) // "b" expires, "c" still alive

	result, err := c.MultiGet(ctx, []string{"a", "b", "c", "missing"})
	require.NoError(t, err)
	require.Equal(t, int64(1), result["a"])
	require.Equal(t, int64(0), result["b"])
	require.Equal(t, int64(3), result["c"])
	require.Equal(t, int64(0), result["missing"])
}

func TestDecrement(t *testing.T) {
	ctx := context.Background()

	t.Run("decrements existing key", func(t *testing.T) {
		c, _ := newCounter(t)
		_, _ = c.Increment(ctx, "k", 10)
		v, err := c.Decrement(ctx, "k", 3)
		require.NoError(t, err)
		require.Equal(t, int64(7), v)
	})

	t.Run("creates key with negative value when absent", func(t *testing.T) {
		c, _ := newCounter(t)
		v, err := c.Decrement(ctx, "k", 5)
		require.NoError(t, err)
		require.Equal(t, int64(-5), v)
	})
}

func TestDecrementIfExists(t *testing.T) {
	ctx := context.Background()

	t.Run("returns not-existed for missing key", func(t *testing.T) {
		c, _ := newCounter(t)
		val, existed, success, err := c.DecrementIfExists(ctx, "k", 1)
		require.NoError(t, err)
		require.False(t, existed)
		require.False(t, success)
		require.Equal(t, int64(0), val)
	})

	t.Run("returns not-existed for expired key", func(t *testing.T) {
		c, clk := newCounter(t)
		_, _ = c.Increment(ctx, "k", 10, time.Minute)
		clk.Tick(2 * time.Minute)
		val, existed, success, err := c.DecrementIfExists(ctx, "k", 1)
		require.NoError(t, err)
		require.False(t, existed)
		require.False(t, success)
		require.Equal(t, int64(0), val)
	})

	t.Run("fails when insufficient credits", func(t *testing.T) {
		c, _ := newCounter(t)
		_, _ = c.Increment(ctx, "k", 3)
		val, existed, success, err := c.DecrementIfExists(ctx, "k", 5)
		require.NoError(t, err)
		require.True(t, existed)
		require.False(t, success)
		require.Equal(t, int64(3), val)
	})

	t.Run("succeeds and returns new value", func(t *testing.T) {
		c, _ := newCounter(t)
		_, _ = c.Increment(ctx, "k", 10)
		val, existed, success, err := c.DecrementIfExists(ctx, "k", 4)
		require.NoError(t, err)
		require.True(t, existed)
		require.True(t, success)
		require.Equal(t, int64(6), val)
	})

	t.Run("does not go below zero", func(t *testing.T) {
		c, _ := newCounter(t)
		_, _ = c.Increment(ctx, "k", 5)
		val, _, success, err := c.DecrementIfExists(ctx, "k", 5)
		require.NoError(t, err)
		require.True(t, success)
		require.Equal(t, int64(0), val)

		_, _, success2, _ := c.DecrementIfExists(ctx, "k", 1)
		require.False(t, success2)
	})
}

func TestSetIfNotExists(t *testing.T) {
	ctx := context.Background()

	t.Run("sets missing key", func(t *testing.T) {
		c, _ := newCounter(t)
		ok, err := c.SetIfNotExists(ctx, "k", 42)
		require.NoError(t, err)
		require.True(t, ok)
		v, _ := c.Get(ctx, "k")
		require.Equal(t, int64(42), v)
	})

	t.Run("does not overwrite existing key", func(t *testing.T) {
		c, _ := newCounter(t)
		_, _ = c.Increment(ctx, "k", 10)
		ok, err := c.SetIfNotExists(ctx, "k", 99)
		require.NoError(t, err)
		require.False(t, ok)
		v, _ := c.Get(ctx, "k")
		require.Equal(t, int64(10), v)
	})

	t.Run("treats expired key as absent", func(t *testing.T) {
		c, clk := newCounter(t)
		_, _ = c.Increment(ctx, "k", 10, time.Minute)
		clk.Tick(2 * time.Minute)
		ok, err := c.SetIfNotExists(ctx, "k", 99)
		require.NoError(t, err)
		require.True(t, ok)
		v, _ := c.Get(ctx, "k")
		require.Equal(t, int64(99), v)
	})
}

func TestDelete(t *testing.T) {
	ctx := context.Background()

	t.Run("removes existing key", func(t *testing.T) {
		c, _ := newCounter(t)
		_, _ = c.Increment(ctx, "k", 5)
		require.NoError(t, c.Delete(ctx, "k"))
		v, _ := c.Get(ctx, "k")
		require.Equal(t, int64(0), v)
	})

	t.Run("no-op on missing key", func(t *testing.T) {
		c, _ := newCounter(t)
		require.NoError(t, c.Delete(ctx, "missing"))
	})
}

func TestClose(t *testing.T) {
	clk := clock.NewTestClock()
	c := counter.NewMemoryCounter(clk)
	require.NoError(t, c.Close())
	require.NoError(t, c.Close()) // idempotent via sync.OnceFunc
}

func TestConcurrentIncrement(t *testing.T) {
	ctx := context.Background()
	c, _ := newCounter(t)

	const goroutines = 50
	const increments = 100
	var wg sync.WaitGroup
	wg.Add(goroutines)
	for range goroutines {
		go func() {
			defer wg.Done()
			for range increments {
				_, _ = c.Increment(ctx, "shared", 1)
			}
		}()
	}
	wg.Wait()

	v, err := c.Get(ctx, "shared")
	require.NoError(t, err)
	require.Equal(t, int64(goroutines*increments), v)
}

func TestDeleteIfEquals(t *testing.T) {
	ctx := context.Background()

	t.Run("deletes a key holding the value", func(t *testing.T) {
		c, _ := newCounter(t)
		_, _ = c.SetIfNotExists(ctx, "k", 7)
		deleted, err := c.DeleteIfEquals(ctx, "k", 7)
		require.NoError(t, err)
		require.True(t, deleted)
		v, _ := c.Get(ctx, "k")
		require.Zero(t, v)
	})

	t.Run("keeps a key holding another value", func(t *testing.T) {
		c, _ := newCounter(t)
		_, _ = c.SetIfNotExists(ctx, "k", 7)
		deleted, err := c.DeleteIfEquals(ctx, "k", 8)
		require.NoError(t, err)
		require.False(t, deleted)
		v, _ := c.Get(ctx, "k")
		require.Equal(t, int64(7), v)
	})

	t.Run("ignores missing and expired keys", func(t *testing.T) {
		c, clk := newCounter(t)
		deleted, err := c.DeleteIfEquals(ctx, "missing", 0)
		require.NoError(t, err)
		require.False(t, deleted)

		_, _ = c.SetIfNotExists(ctx, "k", 7, time.Second)
		clk.Tick(2 * time.Second)
		deleted, err = c.DeleteIfEquals(ctx, "k", 7)
		require.NoError(t, err)
		require.False(t, deleted)
	})
}
