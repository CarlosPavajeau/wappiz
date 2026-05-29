package resources_assign_services

import (
	"net/http"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"

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

	if err := db.Query.DeleteResourceService(c.Request.Context(), h.DB.Primary(), id); err != nil {
		return fault.Wrap(err, fault.Internal("failed to assign services"))

	}

	for _, serviceID := range req.ServiceIDs {
		if err := db.Query.InsertResourceService(c.Request.Context(), h.DB.Primary(), db.InsertResourceServiceParams{
			ResourceID: id,
			ServiceID:  serviceID,
		}); err != nil {
			return fault.Wrap(err, fault.Internal("failed to assign services"))

		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "services assigned"})
	return nil
}
