package tenant_flow_fields_list

import (
	"net/http"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/flowfield"
	"wappiz/svc/api/internal/middleware"

	"github.com/gin-gonic/gin"
)

type Response struct {
	ID         string         `json:"id"`
	FieldKey   string         `json:"fieldKey"`
	Question   string         `json:"question"`
	Rule       flowfield.Spec `json:"rule"`
	IsRequired bool           `json:"isRequired"`
	IsOneTime  bool           `json:"isOneTime"`
	IsEnabled  bool           `json:"isEnabled"`
	SortOrder  int32          `json:"sortOrder"`
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
		rule, err := flowfield.FromColumns(flowfield.Columns{
			Type:      field.FieldType,
			MinLength: field.MinLength,
			MaxLength: field.MaxLength,
			MinValue:  field.MinValue,
			MaxValue:  field.MaxValue,
		})
		if err != nil {
			return fault.Wrap(err, fault.Internal("stored flow field rule is invalid"))
		}
		response[i] = Response{
			ID:         field.ID.String(),
			FieldKey:   field.FieldKey,
			Question:   field.Question,
			Rule:       flowfield.ToSpec(rule),
			IsRequired: field.IsRequired,
			IsOneTime:  field.IsOneTime,
			IsEnabled:  field.IsEnabled,
			SortOrder:  field.SortOrder,
		}
	}

	c.JSON(http.StatusOK, response)
	return nil
}
