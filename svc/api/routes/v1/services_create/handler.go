package services_create

import (
	"database/sql"
	"fmt"
	"net/http"

	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"

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
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodPost }
func (h *Handler) Path() string   { return "/v1/services" }

func (h *Handler) Handle(c *gin.Context) error {
	req, err := server.BindBody[Request](c)
	if err != nil {
		return err
	}

	tenantID := jwt.TenantIDFromContext(c)

	if err := db.Query.InsertService(c.Request.Context(), h.DB.Primary(), db.InsertServiceParams{
		ID:              uuid.New(),
		TenantID:        tenantID,
		Name:            req.Name,
		Description:     sql.NullString{String: req.Description},
		DurationMinutes: req.DurationMinutes,
		BufferMinutes:   req.BufferMinutes,
		Price:           fmt.Sprint(req.Price),
		SortOrder:       1,
	}); err != nil {
		return fault.Wrap(err, fault.Internal("failed to create service"))

	}

	c.Status(http.StatusCreated)
	return nil
}
