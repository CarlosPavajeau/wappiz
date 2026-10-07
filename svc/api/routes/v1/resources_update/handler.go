package resources_update

import (
	"database/sql"
	"net/http"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/svc/api/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"wappiz/pkg/server"
)

type Request struct {
	Name      string `json:"name"      binding:"required,min=2"`
	Type      string `json:"type"      binding:"required"`
	AvatarURL string `json:"avatarUrl"`
	// A pointer so an omitted field is rejected instead of silently
	// pausing the resource through the bool zero value.
	IsActive *bool `json:"isActive"  binding:"required"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodPut }
func (h *Handler) Path() string   { return "/v1/resources/:id" }

func (h *Handler) Handle(c *gin.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid resource id"),
			fault.Public("Id del recurso inválido"),
		)

	}
	req, err := server.BindBody[Request](c)
	if err != nil {
		return err
	}

	tenantID := middleware.TenantIDFromContext(c)

	// isActive does not affect plan quota, so no quota check is needed. The
	// query matches on tenant and skips deleted rows in a single statement,
	// leaving no window between reading the resource and writing it.
	rows, err := db.Query.UpdateResource(c.Request.Context(), h.DB.Primary(), db.UpdateResourceParams{
		Name:      req.Name,
		Type:      req.Type,
		AvatarUrl: sql.NullString{String: req.AvatarURL, Valid: req.AvatarURL != ""},
		IsActive:  *req.IsActive,
		ID:        id,
		TenantID:  tenantID,
	})
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to update resource"))
	}
	if rows == 0 {
		return fault.New("resource not found",
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("resource does not exist, belongs to a different tenant or is deleted"),
			fault.Public("El recurso no existe"),
		)
	}

	c.Status(http.StatusNoContent)
	return nil
}
