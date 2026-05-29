package resources_get_services

import (
	"net/http"
	"strconv"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Response struct {
	ID              uuid.UUID `json:"id"`
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	DurationMinutes int32     `json:"durationMinutes"`
	BufferMinutes   int32     `json:"bufferMinutes"`
	Price           float64   `json:"price"`
	SortOrder       int32     `json:"sortOrder"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodGet }
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

	services, err := db.Query.FindServicesByResourceID(c.Request.Context(), h.DB.Primary(), db.FindServicesByResourceIDParams{
		TenantID:   tenantID,
		ResourceID: id,
	})
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to fetch services"))

	}

	response := make([]Response, len(services))
	for i, s := range services {
		price, _ := strconv.ParseFloat(s.Price, 64)
		response[i] = Response{
			ID:              s.ID,
			Name:            s.Name,
			Description:     s.Description.String,
			DurationMinutes: s.DurationMinutes,
			BufferMinutes:   s.BufferMinutes,
			Price:           price,
			SortOrder:       s.SortOrder,
		}
	}

	c.JSON(http.StatusOK, response)
	return nil
}
