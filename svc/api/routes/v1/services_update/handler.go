package services_update

import (
	"database/sql"
	"fmt"
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
	Name            string  `json:"name"            binding:"required,min=2"`
	Description     string  `json:"description"`
	DurationMinutes int32   `json:"durationMinutes" binding:"required,min=1"`
	BufferMinutes   int32   `json:"bufferMinutes"`
	Price           float64 `json:"price"           binding:"required,min=0"`
	// Pointer so an omitted field is rejected instead of silently pausing the
	// service through bool's zero value.
	IsActive *bool `json:"isActive" binding:"required"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodPut }
func (h *Handler) Path() string   { return "/v1/services/:id" }

func (h *Handler) Handle(c *gin.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid service id"),
			fault.Public("Id del servicio inválido"),
		)

	}
	req, err := server.BindBody[Request](c)
	if err != nil {
		return err
	}

	tenantID := middleware.TenantIDFromContext(c)

	rows, err := db.Query.UpdateService(c.Request.Context(), h.DB.Primary(), db.UpdateServiceParams{
		ID:              id,
		Name:            req.Name,
		Description:     sql.NullString{String: req.Description, Valid: req.Description != ""},
		DurationMinutes: req.DurationMinutes,
		BufferMinutes:   req.BufferMinutes,
		Price:           fmt.Sprint(req.Price),
		IsActive:        *req.IsActive,
		TenantID:        tenantID,
	})
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to update service"))
	}
	if rows == 0 {
		return fault.New("service not found",
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("service does not exist, belongs to a different tenant or is deleted"),
			fault.Public("El servicio no existe"),
		)
	}

	c.Status(http.StatusNoContent)
	return nil
}
