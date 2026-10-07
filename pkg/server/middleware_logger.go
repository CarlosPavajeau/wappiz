package server

import (
	"fmt"
	"log/slog"
	"strings"
	"time"
	"wappiz/pkg/logger"

	"github.com/gin-gonic/gin"
)

// WithLogging emits one wide event per request. Requests whose path starts
// with any of skipPathPrefixes are not logged, so high-frequency traffic such
// as health probes does not drown out real requests.
func WithLogging(skipPathPrefixes ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path

		for _, prefix := range skipPathPrefixes {
			if strings.HasPrefix(path, prefix) {
				c.Next()
				return
			}
		}

		start := time.Now()
		ctx, event := logger.StartWideEvent(c,
			fmt.Sprintf("%s %s", c.Request.Method, path),
		)

		defer event.End()

		c.Request = c.Request.WithContext(ctx)
		c.Next()

		if len(c.Errors) > 0 {
			for _, err := range c.Errors {
				event.SetError(err)
			}
		}

		requestID := c.GetString("request_id")
		event.Set(slog.Group("http",
			slog.String("request_id", requestID),
			slog.String("method", c.Request.Method),
			slog.String("path", path),
			slog.String("host", c.Request.Host),
			slog.String("user_agent", c.Request.UserAgent()),
			slog.String("ip_address", c.ClientIP()),
			slog.Int("status_code", c.Writer.Status()),
			slog.Int64("latency_ms", time.Since(start).Milliseconds()),
		))

	}
}
