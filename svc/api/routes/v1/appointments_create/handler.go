package appointments_create

import (
	"net/http"
	"time"
	"wappiz/internal/events"
	"wappiz/internal/services/booking"
	"wappiz/pkg/server"
	"wappiz/svc/api/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Request struct {
	ResourceID uuid.UUID `json:"resourceId" binding:"required"`
	ServiceID  uuid.UUID `json:"serviceId"  binding:"required"`
	CustomerID uuid.UUID `json:"customerId" binding:"required"`
	StartsAt   time.Time `json:"startsAt"   binding:"required"`
}

type Response struct {
	ID uuid.UUID `json:"id"`
}

type Handler struct {
	Booking *booking.Service
}

func (h *Handler) Method() string { return http.MethodPost }
func (h *Handler) Path() string   { return "/v1/appointments" }

func (h *Handler) Handle(c *gin.Context) error {
	req, err := server.BindBody[Request](c)
	if err != nil {
		return err
	}

	appointment, err := h.Booking.Create(c.Request.Context(), booking.CreateParams{
		TenantID:   middleware.TenantIDFromContext(c),
		Customer:   booking.ExistingCustomer{ID: req.CustomerID},
		ResourceID: req.ResourceID,
		ServiceID:  req.ServiceID,
		StartsAt:   req.StartsAt,
		Source:     events.AppointmentCreatedSourceAdmin,
	})
	if err != nil {
		return err
	}

	c.JSON(http.StatusCreated, Response{ID: appointment.ID})
	return nil
}
