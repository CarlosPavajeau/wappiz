package webhooks_process_webhook

import (
	"net/http"
	"wappiz/internal/services/webhookprocessor"
	"wappiz/pkg/server"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	Processor webhookprocessor.Service
}

func (h *Handler) Method() string {
	return http.MethodPost
}

func (h *Handler) Path() string {
	return "/webhook"
}

func (h *Handler) Handle(c *gin.Context) error {
	req, err := server.BindBody[webhookprocessor.Request](c)
	if err != nil {
		return err
	}

	if req.Object != "whatsapp_business_account" {
		c.Status(http.StatusOK)
		return nil
	}

	c.Status(http.StatusOK)

	h.Processor.Enqueue(req)
	return nil
}
