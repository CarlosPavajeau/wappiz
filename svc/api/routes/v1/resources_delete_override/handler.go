package resources_delete_override

import (
	"net/http"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodDelete }
func (h *Handler) Path() string   { return "/v1/resources/:id/overrides/:oid" }

func (h *Handler) Handle(c *gin.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid resource id"),
			fault.Public("Id del recurso inválido"),
		)

	}
	oid, err := uuid.Parse(c.Param("oid"))
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid override id"),
			fault.Public("Id de la excepción inválido"),
		)

	}

	tenantID := jwt.TenantIDFromContext(c)

	r, err := db.Query.FindResourceById(c.Request.Context(), h.DB.Primary(), id)
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

	if err := db.Query.DeleteScheduleOverride(c.Request.Context(), h.DB.Primary(), db.DeleteScheduleOverrideParams{
		ID:         oid,
		ResourceID: id,
	}); err != nil {
		return fault.Wrap(err, fault.Internal("failed to delete schedule override"))

	}

	c.JSON(http.StatusOK, gin.H{"message": "override deleted"})
	return nil
}
