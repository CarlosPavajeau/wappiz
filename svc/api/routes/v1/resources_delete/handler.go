package resources_delete

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

	tenantID := middleware.TenantIDFromContext(c)

	// Deleting first locks the row, so bookings holding LockLiveResource
	// finish before the count runs and later ones see the deletion. The
	// count then sees every appointment, and a non-zero count rolls the
	// deletion back.
	err = db.Tx(c.Request.Context(), h.DB.Primary(), func(ctx context.Context, tx db.DBTX) error {
		rows, err := db.Query.DeleteResource(ctx, tx, db.DeleteResourceParams{
			ID:       id,
			TenantID: tenantID,
		})
		if err != nil {
			return fault.Wrap(err, fault.Internal("failed to delete resource"))
		}
		if rows == 0 {
			return fault.New("resource not found",
				fault.Code(codes.ErrorsNotFound),
				fault.Internal("resource does not exist, belongs to a different tenant or is deleted"),
				fault.Public("El recurso no existe"),
			)
		}

		upcoming, err := db.Query.CountUpcomingAppointmentsByResource(ctx, tx, id)
		if err != nil {
			return fault.Wrap(err, fault.Internal("failed to count upcoming appointments"))
		}
		if upcoming > 0 {
			return deletion.UpcomingAppointmentsError(deletion.EntityResource, upcoming)
		}

		return nil
	})
	if err != nil {
		return err
	}

	c.JSON(http.StatusOK, gin.H{"message": "resource deleted"})
	return nil
}
