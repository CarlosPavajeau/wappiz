// Package health_liveness reports whether the API process is up and serving
// HTTP. It deliberately checks no dependencies: a database outage must not
// make an orchestrator restart healthy processes in a loop.
package health_liveness

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type response struct {
	Status string `json:"status"`
}

type Handler struct{}

func (h *Handler) Method() string {
	return http.MethodGet
}

func (h *Handler) Path() string {
	return "/health/live"
}

func (h *Handler) Handle(c *gin.Context) error {
	c.JSON(http.StatusOK, response{Status: "ok"})
	return nil
}
