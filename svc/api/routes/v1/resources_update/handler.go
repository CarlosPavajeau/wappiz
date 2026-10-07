package resources_update

import (
	"context"
	"database/sql"
	"net/http"
	"wappiz/internal/services/plans"
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
	// soft-deleting the resource through the bool zero value.
	IsActive *bool `json:"isActive"  binding:"required"`
}

type Handler struct {
	DB    db.Database
	Plans plans.Service
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
	ctx := c.Request.Context()

	err = db.Tx(ctx, h.DB.Primary(), func(ctx context.Context, txx db.DBTX) error {
		r, err := db.Query.FindResourceById(ctx, txx, id)
		if err != nil {
			return fault.Wrap(err,
				fault.Code(codes.ErrorsNotFound),
				fault.Internal("resource not found"),
				fault.Public("El recurso no existe"),
			)
		}
		if r.TenantID != tenantID {
			return fault.New("resource not found",
				fault.Code(codes.ErrorsNotFound),
				fault.Internal("resource belongs to a different tenant"),
				fault.Public("El recurso no existe"),
			)
		}

		// Inactive resources do not count towards the plan quota, so
		// reactivating one consumes a slot exactly like creating it would.
		if !r.IsActive && *req.IsActive {
			if err := h.Plans.EnsureCanCreateResource(ctx, txx, tenantID); err != nil {
				return err
			}
		}

		if err := db.Query.UpdateResource(ctx, txx, db.UpdateResourceParams{
			Name:      req.Name,
			Type:      req.Type,
			AvatarUrl: sql.NullString{String: req.AvatarURL, Valid: req.AvatarURL != ""},
			IsActive:  *req.IsActive,
			ID:        id,
			TenantID:  tenantID,
		}); err != nil {
			return fault.Wrap(err, fault.Internal("failed to update resource"))
		}

		return nil
	})
	if err != nil {
		return err
	}

	c.Status(http.StatusNoContent)
	return nil
}
