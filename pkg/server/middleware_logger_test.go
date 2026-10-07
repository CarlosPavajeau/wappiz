package server

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"wappiz/pkg/logger"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

// syncBuffer guards the buffer because the global logger may be written to
// from any goroutine.
type syncBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *syncBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

func (b *syncBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

func TestWithLogging_SkipsPathPrefixes(t *testing.T) {
	gin.SetMode(gin.TestMode)

	out := &syncBuffer{mu: sync.Mutex{}, buf: bytes.Buffer{}}
	logger.AddHandler(slog.NewJSONHandler(out, nil))

	r := gin.New()
	r.Use(WithLogging("/health/"))
	r.GET("/health/live", func(c *gin.Context) { c.Status(http.StatusOK) })
	r.GET("/v1/things", func(c *gin.Context) { c.Status(http.StatusOK) })

	t.Run("skipped prefix is served but not logged", func(t *testing.T) {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/health/live", nil))

		require.Equal(t, http.StatusOK, w.Code)
		require.NotContains(t, out.String(), "/health/live")
	})

	t.Run("other paths are logged", func(t *testing.T) {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/v1/things", nil))

		require.Equal(t, http.StatusOK, w.Code)
		require.Contains(t, out.String(), "/v1/things")
	})
}
