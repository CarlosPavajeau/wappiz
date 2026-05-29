package services_list

import (
	"net/http"
	"strconv"
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
	TotalMinutes    int32     `json:"totalMinutes"`
	Price           float64   `json:"price"`
	SortOrder       int32     `json:"sortOrder"`
	IsActive        bool      `json:"isActive"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodGet }
func (h *Handler) Path() string   { return "/v1/services" }

func (h *Handler) Handle(c *gin.Context) error {
	tenantID := jwt.TenantIDFromContext(c)

	services, err := db.Query.FindServicesByTenantID(c.Request.Context(), h.DB.Primary(), tenantID)
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
			TotalMinutes:    s.DurationMinutes + s.BufferMinutes,
			Price:           price,
			SortOrder:       s.SortOrder,
			IsActive:        s.IsActive,
		}
	}

	c.JSON(http.StatusOK, response)
	return nil
}
