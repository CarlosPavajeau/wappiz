package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestWithWhatsAppSignature(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const secret = "app-secret"

	sign := func(body []byte) string {
		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write(body)
		return "sha256=" + hex.EncodeToString(mac.Sum(nil))
	}

	serve := func(body []byte, signature string) *httptest.ResponseRecorder {
		r := gin.New()
		r.POST("/webhook", WithWhatsAppSignature(secret), func(c *gin.Context) {
			c.Status(http.StatusOK)
		})
		req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(body))
		req.Header.Set("X-Hub-Signature-256", signature)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}

	t.Run("accepts a signed body", func(t *testing.T) {
		body := []byte(`{"object":"whatsapp_business_account"}`)
		require.Equal(t, http.StatusOK, serve(body, sign(body)).Code)
	})

	t.Run("rejects a bad signature", func(t *testing.T) {
		body := []byte(`{}`)
		require.Equal(t, http.StatusUnauthorized, serve(body, "sha256=00").Code)
	})

	t.Run("rejects an oversized body before checking the signature", func(t *testing.T) {
		body := bytes.Repeat([]byte("a"), maxWebhookBodyBytes+1)
		require.Equal(t, http.StatusRequestEntityTooLarge, serve(body, sign(body)).Code)
	})
}
