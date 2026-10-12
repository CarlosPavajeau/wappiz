package counter

import (
	"context"
	"sync"
	"time"
	"wappiz/pkg/clock"
	"wappiz/pkg/repeat"
)

type entry struct {
	value     int64
	expiresAt time.Time // zero means no expiry
}

// MemoryCounter is a thread-safe in-memory implementation of Counter.
type MemoryCounter struct {
	mu      sync.RWMutex
	entries map[string]*entry
	clock   clock.Clock
	stop    func()
}

var _ Counter = (*MemoryCounter)(nil)

// NewMemoryCounter creates a new MemoryCounter. A background janitor sweeps
// expired entries every minute.
func NewMemoryCounter(clk clock.Clock) *MemoryCounter {
	c := &MemoryCounter{
		entries: make(map[string]*entry),
		clock:   clk,
	}
	c.stop = repeat.Every(time.Minute, c.evict)
	return c
}

func (c *MemoryCounter) isExpired(e *entry) bool {
	return !e.expiresAt.IsZero() && c.clock.Now().After(e.expiresAt)
}

func (c *MemoryCounter) evict() {
	c.mu.Lock()
	defer c.mu.Unlock()
	for k, e := range c.entries {
		if c.isExpired(e) {
			delete(c.entries, k)
		}
	}
}

func (c *MemoryCounter) Increment(_ context.Context, key string, value int64, ttl ...time.Duration) (int64, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	e, ok := c.entries[key]
	if !ok || c.isExpired(e) {
		ne := &entry{value: value}
		if len(ttl) > 0 {
			ne.expiresAt = c.clock.Now().Add(ttl[0])
		}
		c.entries[key] = ne
		return value, nil
	}

	e.value += value
	return e.value, nil
}

func (c *MemoryCounter) Get(_ context.Context, key string) (int64, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	e, ok := c.entries[key]
	if !ok || c.isExpired(e) {
		return 0, nil
	}
	return e.value, nil
}

func (c *MemoryCounter) MultiGet(ctx context.Context, keys []string) (map[string]int64, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	result := make(map[string]int64, len(keys))
	for _, key := range keys {
		e, ok := c.entries[key]
		if !ok || c.isExpired(e) {
			result[key] = 0
		} else {
			result[key] = e.value
		}
	}
	return result, nil
}

func (c *MemoryCounter) Decrement(ctx context.Context, key string, value int64, ttl ...time.Duration) (int64, error) {
	return c.Increment(ctx, key, -value, ttl...)
}

func (c *MemoryCounter) DecrementIfExists(_ context.Context, key string, value int64) (int64, bool, bool, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	e, ok := c.entries[key]
	if !ok || c.isExpired(e) {
		return 0, false, false, nil
	}

	if e.value < value {
		return e.value, true, false, nil
	}

	e.value -= value
	return e.value, true, true, nil
}

func (c *MemoryCounter) SetIfNotExists(_ context.Context, key string, value int64, ttl ...time.Duration) (bool, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	e, ok := c.entries[key]
	if ok && !c.isExpired(e) {
		return false, nil
	}

	ne := &entry{value: value}
	if len(ttl) > 0 {
		ne.expiresAt = c.clock.Now().Add(ttl[0])
	}
	c.entries[key] = ne
	return true, nil
}

func (c *MemoryCounter) Delete(_ context.Context, key string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.entries, key)
	return nil
}

func (c *MemoryCounter) DeleteIfEquals(_ context.Context, key string, value int64) (bool, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	e, ok := c.entries[key]
	if !ok || c.isExpired(e) || e.value != value {
		return false, nil
	}
	delete(c.entries, key)
	return true, nil
}

func (c *MemoryCounter) Close() error {
	c.stop()
	return nil
}
