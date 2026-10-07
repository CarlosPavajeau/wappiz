package services_delete

import (
	"net/http"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/svc/api/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodDelete }
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

	tenantID := middleware.TenantIDFromContext(c)

	rows, err := db.Query.DeleteService(c.Request.Context(), h.DB.Primary(), db.DeleteServiceParams{
		ID:       id,
		TenantID: tenantID,
	})
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to delete service"))
	}
	if rows == 0 {
		return fault.New("service not found",
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("service does not exist, belongs to a different tenant or is deleted"),
			fault.Public("El servicio no existe"),
		)
	}

	c.JSON(http.StatusOK, gin.H{"message": "service deleted"})
	return nil
}
