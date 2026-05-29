package customers_get_incidents

import (
	"net/http"
	"time"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Response struct {
	ID            uuid.UUID `json:"id"`
	EventType     string    `json:"eventType"`
	AppointmentID uuid.UUID `json:"appointmentId"`
	StartsAt      time.Time `json:"startsAt"`
	OccurredAt    time.Time `json:"occurredAt"`
	ServiceName   string    `json:"serviceName"`
	ResourceName  string    `json:"resourceName"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodGet }
func (h *Handler) Path() string   { return "/v1/customers/:id/incidents" }

func (h *Handler) Handle(c *gin.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid customer id"),
			fault.Public("Id del cliente inválido"),
		)

	}

	tenantID := jwt.TenantIDFromContext(c)

	incidents, err := db.Query.FindCustomerIncidents(c.Request.Context(), h.DB.Primary(), db.FindCustomerIncidentsParams{
		CustomerID: id,
		TenantID:   tenantID,
	})
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to list customer incidents"))

	}

	response := make([]Response, len(incidents))
	for i, incident := range incidents {
		response[i] = Response{
			ID:            incident.ID,
			EventType:     incident.EventType,
			AppointmentID: incident.AppointmentID,
			StartsAt:      incident.StartsAt,
			OccurredAt:    incident.OccurredAt,
			ServiceName:   incident.ServiceName,
			ResourceName:  incident.ResourceName,
		}
	}

	c.JSON(http.StatusOK, response)
	return nil
}
