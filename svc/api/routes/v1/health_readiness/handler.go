// Package health_readiness reports whether the API instance can serve
// traffic. Only Postgres is checked: Redis backs rate limiting, which keeps
// local state and degrades gracefully, so its outage does not make the API
// unable to serve requests.
package health_readiness

import (
	"context"
	"net/http"
	"time"
	"wappiz/pkg/logger"

	"github.com/gin-gonic/gin"
)

// pingTimeout stays well below common probe timeouts so the handler answers
// 503 itself instead of letting the prober time out.
const pingTimeout = 2 * time.Second

// Pinger is the slice of the database the probe needs.
type Pinger interface {
	PingContext(ctx context.Context) error
}

type status string

const (
	statusOK          status = "ok"
	statusUnavailable status = "unavailable"
)

type checkStatus string

const (
	checkUp   checkStatus = "up"
	checkDown checkStatus = "down"
)

type checks struct {
	Database checkStatus `json:"database"`
}

type response struct {
	Status status `json:"status"`
	Checks checks `json:"checks"`
}

type Handler struct {
	DB Pinger
}

func (h *Handler) Method() string {
	return http.MethodGet
}

func (h *Handler) Path() string {
	return "/health/ready"
}

func (h *Handler) Handle(c *gin.Context) error {
	ctx, cancel := context.WithTimeout(c.Request.Context(), pingTimeout)
	defer cancel()

	if err := h.DB.PingContext(ctx); err != nil {
		// The endpoint is public, so the cause is logged rather than returned.
		logger.Warn("readiness check failed", "check", "database", "error", err)
		c.JSON(http.StatusServiceUnavailable, response{
			Status: statusUnavailable,
			Checks: checks{Database: checkDown},
		})
		return nil
	}

	c.JSON(http.StatusOK, response{
		Status: statusOK,
		Checks: checks{Database: checkUp},
	})
	return nil
}
