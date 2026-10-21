package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestWithOriginSecret(t *testing.T) {
	gin.SetMode(gin.TestMode)

	newRouter := func(secret string) *gin.Engine {
		r := gin.New()
		r.Use(WithOriginSecret(secret))
		r.GET("/v1/ping", func(c *gin.Context) { c.Status(http.StatusOK) })
		r.GET("/health/ready", func(c *gin.Context) { c.Status(http.StatusOK) })
		return r
	}

	serve := func(r *gin.Engine, path, header string) int {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		if header != "" {
			req.Header.Set(OriginSecretHeader, header)
		}
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w.Code
	}

	t.Run("accepts the matching secret", func(t *testing.T) {
		require.Equal(t, http.StatusOK, serve(newRouter("s3cret"), "/v1/ping", "s3cret"))
	})

	t.Run("rejects a missing secret", func(t *testing.T) {
		require.Equal(t, http.StatusForbidden, serve(newRouter("s3cret"), "/v1/ping", ""))
	})

	t.Run("rejects a wrong secret", func(t *testing.T) {
		require.Equal(t, http.StatusForbidden, serve(newRouter("s3cret"), "/v1/ping", "nope"))
	})

	t.Run("lets platform health probes through", func(t *testing.T) {
		require.Equal(t, http.StatusOK, serve(newRouter("s3cret"), "/health/ready", ""))
	})

	t.Run("disabled when no secret is configured", func(t *testing.T) {
		require.Equal(t, http.StatusOK, serve(newRouter(""), "/v1/ping", ""))
	})
}
