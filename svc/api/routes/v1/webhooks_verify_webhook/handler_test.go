package webhooks_verify_webhook

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestHandle(t *testing.T) {
	gin.SetMode(gin.TestMode)

	serve := func(h *Handler, mode, token string) *httptest.ResponseRecorder {
		r := gin.New()
		r.GET(h.Path(), func(c *gin.Context) {
			require.NoError(t, h.Handle(c))
		})
		q := url.Values{"hub.mode": {mode}, "hub.verify_token": {token}, "hub.challenge": {"challenge-123"}}
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, h.Path()+"?"+q.Encode(), nil))
		return w
	}

	t.Run("echoes the challenge when the token matches", func(t *testing.T) {
		w := serve(&Handler{VerifyToken: "secret"}, "subscribe", "secret")
		require.Equal(t, http.StatusOK, w.Code)
		require.Equal(t, "challenge-123", w.Body.String())
	})

	t.Run("rejects a wrong token", func(t *testing.T) {
		require.Equal(t, http.StatusForbidden, serve(&Handler{VerifyToken: "secret"}, "subscribe", "other").Code)
	})

	t.Run("rejects a mode other than subscribe", func(t *testing.T) {
		require.Equal(t, http.StatusForbidden, serve(&Handler{VerifyToken: "secret"}, "unsubscribe", "secret").Code)
	})

	t.Run("rejects an empty token even when none is configured", func(t *testing.T) {
		require.Equal(t, http.StatusForbidden, serve(&Handler{}, "subscribe", "").Code)
	})
}
