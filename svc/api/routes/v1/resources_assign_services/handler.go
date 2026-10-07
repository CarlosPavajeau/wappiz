package resources_assign_services

import (
	"bytes"
	"context"
	"net/http"
	"slices"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/svc/api/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"wappiz/pkg/server"
)

type Request struct {
	ServiceIDs []uuid.UUID `json:"serviceIds" binding:"required"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodPut }
func (h *Handler) Path() string   { return "/v1/resources/:id/services" }

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

	r, err := db.Query.FindResourceById(c.Request.Context(), h.DB.Primary(), id)
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("resource not found"),
			fault.Public("El recurso no existe"),
		)

	}
	if r.TenantID != tenantID || r.DeletedAt.Valid {
		return fault.New("resource not found",
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("resource belongs to a different tenant or is deleted"),
			fault.Public("El recurso no existe"),
		)

	}

	serviceIDs := slices.Compact(slices.SortedFunc(slices.Values(req.ServiceIDs), func(a, b uuid.UUID) int {
		return bytes.Compare(a[:], b[:])
	}))

	// Replacing the links in one transaction keeps a rejected or failed request
	// from leaving the resource with none of its previous services.
	err = db.Tx(c.Request.Context(), h.DB.Primary(), func(ctx context.Context, tx db.DBTX) error {
		if err := db.Query.DeleteResourceService(ctx, tx, id); err != nil {
			return fault.Wrap(err, fault.Internal("failed to unlink services"))
		}

		linked, err := db.Query.InsertResourceServicesForTenant(ctx, tx, db.InsertResourceServicesForTenantParams{
			ResourceID: id,
			ServiceIds: serviceIDs,
			TenantID:   tenantID,
		})
		if err != nil {
			return fault.Wrap(err, fault.Internal("failed to link services"))
		}
		if linked != int64(len(serviceIDs)) {
			return fault.New("unknown services",
				fault.Code(codes.ErrorsBadRequest),
				fault.Internal("some service ids do not exist, belong to a different tenant or are deleted"),
				fault.Public("Uno o más servicios no existen"),
			)
		}

		return nil
	})
	if err != nil {
		return err
	}

	c.JSON(http.StatusOK, gin.H{"message": "services assigned"})
	return nil
}
