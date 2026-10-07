package health_readiness

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"wappiz/pkg/server"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

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

	t.Run("ping is bounded by a deadline", func(t *testing.T) {
		t.Parallel()

		var hasDeadline bool
		w := serve(t, pingerFunc(func(ctx context.Context) error {
			_, hasDeadline = ctx.Deadline()
			return context.DeadlineExceeded
		}))

		require.True(t, hasDeadline)
		require.Equal(t, http.StatusServiceUnavailable, w.Code)
	})
}
