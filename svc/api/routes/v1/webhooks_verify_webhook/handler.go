package webhooks_verify_webhook

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	verifyToken string
}

func (h *Handler) Method() string {
	return http.MethodGet
}

func (h *Handler) Path() string {
	return "/webhook"
}

func (h *Handler) Handle(c *gin.Context) error {
	mode := c.Query("hub.mode")
	token := c.Query("hub.verify_token")
	challenge := c.Query("hub.challenge")

	if mode == "subscribe" && token == h.verifyToken {
		c.String(http.StatusOK, challenge)
		return nil
	}

	c.Status(http.StatusForbidden)
	return nil
}
