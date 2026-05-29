package admin_find_pending_activations

import (
	"net/http"
	"time"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Response struct {
	TenantID     uuid.UUID `json:"tenantId"`
	TenantName   string    `json:"tenantName"`
	ContactEmail string    `json:"contactEmail"`
	Notes        string    `json:"notes"`
	Status       string    `json:"status"`
	RequestedAt  string    `json:"requestedAt"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string {
	return http.MethodGet
}

func (h *Handler) Path() string {
	return "/v1/admin/activations"
}

func (h *Handler) Handle(c *gin.Context) error {
	activations, err := db.Query.FindTenantPendingActivations(c.Request.Context(), h.DB.Primary())
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to fetch activations"))

	}

	response := make([]Response, len(activations))
	for i, a := range activations {
		response[i] = Response{
			TenantID:     a.TenantID,
			TenantName:   a.TenantName,
			ContactEmail: a.ContactEmail,
			Notes:        a.ActivationNotes,
			Status:       string(a.ActivationStatus),
			RequestedAt:  a.ActivationRequestedAt.Time.Format(time.RFC3339),
		}
	}

	c.JSON(http.StatusOK, response)
	return nil
}
