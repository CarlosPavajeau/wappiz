package health_liveness

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"wappiz/pkg/server"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestHandle_ReturnsOK(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	h := &Handler{}
	r := gin.New()
	r.Handle(h.Method(), h.Path(), server.ToGinHandler(h))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/health/live", nil))

	require.Equal(t, http.StatusOK, w.Code)
	require.JSONEq(t, `{"status":"ok"}`, w.Body.String())
}
