package tenant_flow_fields_update

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

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodPut }
func (h *Handler) Path() string   { return "/v1/tenants/flow-fields/:id" }

func (h *Handler) Handle(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.Error(fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid flow field id"),
			fault.Public("Id del campo invalido"),
		))
		return
	}

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

	if err := db.Query.UpdateFlowField(c.Request.Context(), h.DB.Primary(), db.UpdateFlowFieldParams{
		ID:         id,
		TenantID:   jwt.TenantIDFromContext(c),
		Question:   sql.NullString{String: question, Valid: true},
		IsRequired: *req.IsRequired,
		SortOrder:  *req.SortOrder,
	}); err != nil {
		c.Error(fault.Wrap(err, fault.Internal("failed to update flow field")))
		return
	}

	c.Status(http.StatusNoContent)
}
