package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// maxWebhookBodyBytes bounds what is buffered before the signature is checked,
// so an unauthenticated caller cannot make the server hold an arbitrarily large
// body in memory. Meta batches stay far below this.
const maxWebhookBodyBytes = 1 << 20

func WithWhatsAppSignature(appSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		signature := c.GetHeader("X-Hub-Signature-256")
		if signature == "" {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		body, err := io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, maxWebhookBodyBytes))
		if err != nil {
			var tooLarge *http.MaxBytesError
			if errors.As(err, &tooLarge) {
				c.AbortWithStatus(http.StatusRequestEntityTooLarge)
				return
			}
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}

		if !validSignature(body, signature, appSecret) {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		c.Request.Body = io.NopCloser(bytes.NewReader(body))
		c.Next()
	}
}

func validSignature(body []byte, signature, secret string) bool {
	// Headers coming like "sha256=<hash>"
	parts := strings.SplitN(signature, "=", 2)
	if len(parts) != 2 || parts[0] != "sha256" {
		return false
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(parts[1]), []byte(expected))
}
