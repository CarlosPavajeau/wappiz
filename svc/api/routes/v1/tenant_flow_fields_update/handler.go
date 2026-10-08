package tenant_flow_fields_update

import (
	"net/http"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/flowfield"
	"wappiz/svc/api/internal/middleware"

	"wappiz/pkg/server"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Request struct {
	Question   string          `json:"question"`
	Rule       *flowfield.Spec `json:"rule"`
	IsRequired *bool           `json:"isRequired"`
	IsOneTime  *bool           `json:"isOneTime"`
	SortOrder  *int32          `json:"sortOrder"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodPut }
func (h *Handler) Path() string   { return "/v1/tenants/flow-fields/:id" }

func (h *Handler) Handle(c *gin.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid flow field id"),
			fault.Public("Id del campo invalido"),
		)

	}
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

	rowsAffected, err := db.Query.UpdateFlowField(c.Request.Context(), h.DB.Primary(), db.UpdateFlowFieldParams{
		ID:         id,
		TenantID:   middleware.TenantIDFromContext(c),
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
		return fault.Wrap(err, fault.Internal("failed to update flow field"))

	}
	if rowsAffected == 0 {
		return fault.New("flow field not found",
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("flow field not found for tenant"),
			fault.Public("Campo no encontrado"),
		)

	}

	c.Status(http.StatusNoContent)
	return nil
}
