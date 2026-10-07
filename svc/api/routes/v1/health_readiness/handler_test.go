package health_readiness

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"wappiz/pkg/server"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

// probeBudget is the slowest answer a prober should ever wait for, matching
// the 3s readiness probe timeout we recommend for Kubernetes. It is fixed
// independently of pingTimeout so raising the timeout fails these tests.
const probeBudget = 3 * time.Second

type pingerFunc func(ctx context.Context) error

func (f pingerFunc) PingContext(ctx context.Context) error {
	return f(ctx)
}

func serve(t *testing.T, db Pinger) *httptest.ResponseRecorder {
	t.Helper()
	gin.SetMode(gin.TestMode)

	h := &Handler{DB: db}
	r := gin.New()
	r.Handle(h.Method(), h.Path(), server.ToGinHandler(h))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/health/ready", nil))
	return w
}

func TestHandle(t *testing.T) {
	t.Parallel()

	t.Run("database reachable", func(t *testing.T) {
		t.Parallel()

		w := serve(t, pingerFunc(func(context.Context) error { return nil }))

		require.Equal(t, http.StatusOK, w.Code)
		require.JSONEq(t, `{"status":"ok","checks":{"database":"up"}}`, w.Body.String())
	})

	t.Run("database unreachable", func(t *testing.T) {
		t.Parallel()

		w := serve(t, pingerFunc(func(context.Context) error {
			return errors.New("connection refused")
		}))

		require.Equal(t, http.StatusServiceUnavailable, w.Code)
		require.JSONEq(t, `{"status":"unavailable","checks":{"database":"down"}}`, w.Body.String())
		require.NotContains(t, w.Body.String(), "connection refused")
	})

	t.Run("ping deadline matches pingTimeout", func(t *testing.T) {
		t.Parallel()

		var deadline time.Time
		var hasDeadline bool
		start := time.Now()
		w := serve(t, pingerFunc(func(ctx context.Context) error {
			deadline, hasDeadline = ctx.Deadline()
			return context.DeadlineExceeded
		}))

		require.Less(t, pingTimeout, probeBudget)
		require.True(t, hasDeadline)
		require.WithinDuration(t, start.Add(pingTimeout), deadline, 100*time.Millisecond)
		require.Equal(t, http.StatusServiceUnavailable, w.Code)
	})

	t.Run("hanging database answers within pingTimeout", func(t *testing.T) {
		t.Parallel()

		start := time.Now()
		w := serve(t, pingerFunc(func(ctx context.Context) error {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(probeBudget):
				return errors.New("ping was never cancelled")
			}
		}))
		elapsed := time.Since(start)

		require.Less(t, elapsed, probeBudget)
		require.GreaterOrEqual(t, elapsed, pingTimeout)
		require.Equal(t, http.StatusServiceUnavailable, w.Code)
		require.JSONEq(t, `{"status":"unavailable","checks":{"database":"down"}}`, w.Body.String())
	})
}
