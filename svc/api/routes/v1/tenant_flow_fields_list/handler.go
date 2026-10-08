package tenant_flow_fields_list

import (
	"net/http"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/svc/api/internal/middleware"

	"github.com/gin-gonic/gin"
)

type Response struct {
	ID         string `json:"id"`
	FieldKey   string `json:"fieldKey"`
	Question   string `json:"question"`
	IsRequired bool   `json:"isRequired"`
	IsOneTime  bool   `json:"isOneTime"`
	IsEnabled  bool   `json:"isEnabled"`
	SortOrder  int32  `json:"sortOrder"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodGet }
func (h *Handler) Path() string   { return "/v1/tenants/flow-fields" }

func (h *Handler) Handle(c *gin.Context) error {
	tenantID := middleware.TenantIDFromContext(c)

	fields, err := db.Query.FindAllTenantFlowFields(c.Request.Context(), h.DB.Primary(), tenantID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to retrieve flow fields"))

	}

	response := make([]Response, len(fields))
	for i, field := range fields {
		response[i] = Response{
			ID:         field.ID.String(),
			FieldKey:   field.FieldKey,
			Question:   field.Question,
			IsRequired: field.IsRequired,
			IsOneTime:  field.IsOneTime,
			IsEnabled:  field.IsEnabled,
			SortOrder:  field.SortOrder,
		}
	}

	c.JSON(http.StatusOK, response)
	return nil
}
