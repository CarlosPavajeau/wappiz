package statemachine

import (
	"context"
	"sync"
	"testing"
	"wappiz/internal/services/ratelimit"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

// countingRatelimit allows each bucket a fixed number of hits, ignoring time.
type countingRatelimit struct {
	ratelimit.Service
	mu   sync.Mutex
	hits map[string]int64
}

func (r *countingRatelimit) Ratelimit(_ context.Context, req ratelimit.RatelimitRequest) (ratelimit.RatelimitResponse, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	key := req.Name + "|" + req.Identifier
	r.hits[key]++
	return ratelimit.RatelimitResponse{Success: r.hits[key] <= req.Limit}, nil
}

func TestProcess_RateLimitsSender(t *testing.T) {
	t.Parallel()

	wa := &recordingWhatsapp{}
	limiter := &countingRatelimit{hits: map[string]int64{}}
	// No database: a rate limited message must be dropped before any query.
	svc := New(Config{Whatsapp: wa, Ratelimit: limiter})
	msg := IncomingMessage{TenantID: uuid.New(), From: "573001234567", Body: "hola"}

	limiter.hits["whatsapp-messages-per-sender|"+msg.TenantID.String()+":"+msg.From] = senderMessagesPerMinute

	for range 3 {
		require.NoError(t, svc.Process(context.Background(), msg))
	}

	sent := wa.sent()
	require.Len(t, sent, 1, "the sender is told once per window, not once per message")
	require.Contains(t, sent[0], "muchos mensajes")
}
