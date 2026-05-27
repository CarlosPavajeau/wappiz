package tenant_flow_fields_create

import (
	"database/sql"
	"net/http"
	"strings"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Request struct {
	Question   string `json:"question"`
	IsRequired *bool  `json:"isRequired"`
	SortOrder  *int32 `json:"sortOrder"`
}

type Response struct {
	ID         string `json:"id"`
	FieldKey   string `json:"fieldKey"`
	FieldType  string `json:"fieldType"`
	Question   string `json:"question"`
	IsRequired bool   `json:"isRequired"`
	IsEnabled  bool   `json:"isEnabled"`
	SortOrder  int32  `json:"sortOrder"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodPost }
func (h *Handler) Path() string   { return "/v1/tenants/flow-fields" }

func (h *Handler) Handle(c *gin.Context) {
	var req Request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid request body"),
			fault.Public("Los datos enviados son invalidos"),
		))
		return
	}

	question := strings.TrimSpace(req.Question)
	if len(question) < 2 || req.IsRequired == nil || req.SortOrder == nil || *req.SortOrder < 0 {
		c.Error(fault.New("invalid flow field",
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid flow field payload"),
			fault.Public("Los datos enviados son invalidos"),
		))
		return
	}

	id := uuid.New()
	field, err := db.Query.InsertCustomTenantFlowField(c.Request.Context(), h.DB.Primary(), db.InsertCustomTenantFlowFieldParams{
		ID:         id,
		TenantID:   jwt.TenantIDFromContext(c),
		FieldKey:   customFieldKey(id),
		Question:   sql.NullString{String: question, Valid: true},
		IsRequired: *req.IsRequired,
		SortOrder:  *req.SortOrder,
	})
	if err != nil {
		c.Error(fault.Wrap(err, fault.Internal("failed to create flow field")))
		return
	}

	c.JSON(http.StatusCreated, Response{
		ID:         field.ID.String(),
		FieldKey:   field.FieldKey,
		FieldType:  string(field.FieldType),
		Question:   field.Question.String,
		IsRequired: field.IsRequired,
		IsEnabled:  field.IsEnabled,
		SortOrder:  field.SortOrder,
	})
}

func customFieldKey(id uuid.UUID) string {
	return "custom_" + strings.ReplaceAll(id.String(), "-", "")[:16]
}
