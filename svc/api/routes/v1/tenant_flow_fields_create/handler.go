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
	"wappiz/pkg/server"
)

type Request struct {
	Question   string `json:"question"`
	IsRequired *bool  `json:"isRequired"`
	IsOneTime  *bool  `json:"isOneTime"`
	SortOrder  *int32 `json:"sortOrder"`
}

type Response struct {
	ID         string `json:"id"`
	FieldKey   string `json:"fieldKey"`
	FieldType  string `json:"fieldType"`
	Question   string `json:"question"`
	IsRequired bool   `json:"isRequired"`
	IsOneTime  bool   `json:"isOneTime"`
	IsEnabled  bool   `json:"isEnabled"`
	SortOrder  int32  `json:"sortOrder"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodPost }
func (h *Handler) Path() string   { return "/v1/tenants/flow-fields" }

func (h *Handler) Handle(c *gin.Context) error {
	req, err := server.BindBody[Request](c)
	if err != nil {
		return err
	}

	question := strings.TrimSpace(req.Question)
	if len(question) < 2 || req.IsRequired == nil || req.SortOrder == nil || *req.SortOrder < 0 {
		return fault.New("invalid flow field",
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid flow field payload"),
			fault.Public("Los datos enviados son invalidos"),
		)

	}

	isOneTime := false
	if req.IsOneTime != nil {
		isOneTime = *req.IsOneTime
	}

	id := uuid.New()
	field, err := db.Query.InsertCustomTenantFlowField(c.Request.Context(), h.DB.Primary(), db.InsertCustomTenantFlowFieldParams{
		ID:         id,
		TenantID:   jwt.TenantIDFromContext(c),
		FieldKey:   customFieldKey(id),
		Question:   sql.NullString{String: question, Valid: true},
		IsRequired: *req.IsRequired,
		IsOneTime:  isOneTime,
		SortOrder:  *req.SortOrder,
	})
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to create flow field"))

	}

	c.JSON(http.StatusCreated, Response{
		ID:         field.ID.String(),
		FieldKey:   field.FieldKey,
		FieldType:  string(field.FieldType),
		Question:   field.Question.String,
		IsRequired: field.IsRequired,
		IsOneTime:  field.IsOneTime,
		IsEnabled:  field.IsEnabled,
		SortOrder:  field.SortOrder,
	})
	return nil
}

func customFieldKey(id uuid.UUID) string {
	return "custom_" + strings.ReplaceAll(id.String(), "-", "")[:16]
}
