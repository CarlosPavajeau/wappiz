package middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// OriginSecretHeader is added to every proxied request by a Cloudflare
// Transform Rule. Its presence proves the request went through Cloudflare's
// WAF rather than straight to the platform's public origin hostname.
const OriginSecretHeader = "X-Origin-Secret"

// WithOriginSecret rejects requests that do not carry the shared secret.
// Health probes come from the hosting platform itself, never through
// Cloudflare, so they are let through. An empty secret disables the check
// for local development.
func WithOriginSecret(secret string) gin.HandlerFunc {
	if secret == "" {
		return func(c *gin.Context) { c.Next() }
	}

	return func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/health/") {
			c.Next()
			return
		}

		got := c.GetHeader(OriginSecretHeader)
		if subtle.ConstantTimeCompare([]byte(got), []byte(secret)) != 1 {
			c.AbortWithStatus(http.StatusForbidden)
			return
		}

		c.Next()
	}
}
