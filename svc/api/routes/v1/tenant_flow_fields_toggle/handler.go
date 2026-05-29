package tenant_flow_fields_toggle

import (
	"net/http"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodPatch }
func (h *Handler) Path() string   { return "/v1/tenants/flow-fields/:id/toggle" }

func (h *Handler) Handle(c *gin.Context) error {
	id := c.Param("id")
	flowFieldID, err := uuid.Parse(id)
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("Failed parsing id"), fault.Public("Identificador del campo inválido"),
		)

	}

	tenantId := jwt.TenantIDFromContext(c)

	err = db.Query.ToggleFlowField(c.Request.Context(), h.DB.Primary(), db.ToggleFlowFieldParams{
		ID:       flowFieldID,
		TenantID: tenantId,
	})

	if err != nil {
		return fault.Wrap(err, fault.Internal("failed toggling flow field"))

	}

	c.Status(http.StatusOK)
	return nil
}
