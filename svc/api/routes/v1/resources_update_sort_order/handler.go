package resources_update_sort_order

import (
	"net/http"

	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"wappiz/pkg/server"
)

type SortItem struct {
	ID        uuid.UUID `json:"id"        binding:"required"`
	SortOrder int32     `json:"sortOrder"`
}

type Request struct {
	Order []SortItem `json:"order" binding:"required,min=1"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodPut }
func (h *Handler) Path() string   { return "/v1/resources/sort-order" }

func (h *Handler) Handle(c *gin.Context) error {
	req, err := server.BindBody[Request](c)
	if err != nil {
		return err
	}

	tenantID := jwt.TenantIDFromContext(c)

	for _, item := range req.Order {
		if _, err := h.DB.Primary().ExecContext(
			c.Request.Context(),
			"UPDATE resources SET sort_order = $1 WHERE id = $2 AND tenant_id = $3",
			item.SortOrder, item.ID, tenantID,
		); err != nil {
			return fault.Wrap(err, fault.Internal("failed to update sort order"))

		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "sort order updated"})
	return nil
}
