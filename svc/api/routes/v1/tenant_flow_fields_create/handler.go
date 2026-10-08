package tenant_flow_fields_create

import (
	"net/http"
	"strings"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/flowfield"
	"wappiz/svc/api/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"wappiz/pkg/server"
)

type Request struct {
	Question   string          `json:"question"`
	Rule       *flowfield.Spec `json:"rule"`
	IsRequired *bool           `json:"isRequired"`
	IsOneTime  *bool           `json:"isOneTime"`
	SortOrder  *int32          `json:"sortOrder"`
}

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

func (h *Handler) Method() string { return http.MethodPost }
func (h *Handler) Path() string   { return "/v1/tenants/flow-fields" }

func (h *Handler) Handle(c *gin.Context) error {
	req, err := server.BindBody[Request](c)
	if err != nil {
		return err
	}

	if req.Rule == nil || req.IsRequired == nil || req.SortOrder == nil || *req.SortOrder < 0 {
		return fault.New("invalid flow field",
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid flow field payload"),
			fault.Public("Los datos enviados son invalidos"),
		)

	}

	question, err := flowfield.ParseQuestion(req.Question)
	if err != nil {
		return err
	}

	rule, err := flowfield.FromSpec(*req.Rule)
	if err != nil {
		return err
	}
	columns := flowfield.ToColumns(rule)

	isOneTime := false
	if req.IsOneTime != nil {
		isOneTime = *req.IsOneTime
	}

	id := uuid.New()
	field, err := db.Query.InsertTenantFlowField(c.Request.Context(), h.DB.Primary(), db.InsertTenantFlowFieldParams{
		ID:         id,
		TenantID:   middleware.TenantIDFromContext(c),
		FieldKey:   customFieldKey(id),
		Question:   question,
		FieldType:  columns.Type,
		MinLength:  columns.MinLength,
		MaxLength:  columns.MaxLength,
		MinValue:   columns.MinValue,
		MaxValue:   columns.MaxValue,
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
		Question:   field.Question,
		Rule:       flowfield.ToSpec(rule),
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
