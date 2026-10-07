package services_delete

import (
	"context"
	"net/http"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/svc/api/internal/deletion"
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

	// Same ordering as resources_delete: the deletion locks the row before
	// counting, so no booking can slip in between.
	err = db.Tx(c.Request.Context(), h.DB.Primary(), func(ctx context.Context, tx db.DBTX) error {
		rows, err := db.Query.DeleteService(ctx, tx, db.DeleteServiceParams{
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

		upcoming, err := db.Query.CountUpcomingAppointmentsByService(ctx, tx, id)
		if err != nil {
			return fault.Wrap(err, fault.Internal("failed to count upcoming appointments"))
		}
		if upcoming > 0 {
			return deletion.UpcomingAppointmentsError(deletion.EntityService, upcoming)
		}

		return nil
	})
	if err != nil {
		return err
	}

	c.JSON(http.StatusOK, gin.H{"message": "service deleted"})
	return nil
}
