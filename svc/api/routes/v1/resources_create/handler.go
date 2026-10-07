package resources_create

import (
	"context"
	"database/sql"
	"net/http"
	"wappiz/internal/services/plans"
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
}

type Handler struct {
	DB    db.Database
	Plans plans.Service
}

func (h *Handler) Method() string { return http.MethodPost }
func (h *Handler) Path() string   { return "/v1/resources" }

func (h *Handler) Handle(c *gin.Context) error {
	req, err := server.BindBody[Request](c)
	if err != nil {
		return err
	}

	tenantID := middleware.TenantIDFromContext(c)
	ctx := c.Request.Context()

	err = db.Tx(ctx, h.DB.Primary(), func(ctx context.Context, txx db.DBTX) error {
		if err := h.Plans.EnsureCanCreateResource(ctx, txx, tenantID); err != nil {
			return err
		}

		if err := db.Query.InsertResource(ctx, txx, db.InsertResourceParams{
			ID:        uuid.New(),
			TenantID:  tenantID,
			Name:      req.Name,
			Type:      req.Type,
			AvatarUrl: sql.NullString{String: req.AvatarURL, Valid: req.AvatarURL != ""},
			SortOrder: 1,
		}); err != nil {
			return fault.Wrap(err, fault.Internal("failed to create resource"))
		}

		return nil
	})
	if err != nil {
		return err
	}

	c.Status(http.StatusCreated)
	return nil
}
