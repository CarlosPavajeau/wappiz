package webhooks_verify_webhook

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Handler answers Meta's subscription handshake for the WhatsApp webhook: Meta sends the token configured in
// the app and expects the challenge back.
type Handler struct {
	// VerifyToken is WEBHOOK_VERIFY_TOKEN, the token entered in the Meta app's webhook settings.
	VerifyToken string
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

	// An empty configured token would accept any handshake that omits it.
	if mode == "subscribe" && h.VerifyToken != "" && token == h.VerifyToken {
		c.String(http.StatusOK, challenge)
		return nil
	}

	c.Status(http.StatusForbidden)
	return nil
}
