package appointments_get_status_history

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
	FromStatus    string    `json:"fromStatus"`
	ToStatus      string    `json:"toStatus"`
	ChangedBy     *string   `json:"changedBy"`
	ChangedByRole string    `json:"changedByRole"`
	Reason        string    `json:"reason"`
	CreatedAt     time.Time `json:"createdAt"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodGet }
func (h *Handler) Path() string   { return "/v1/appointments/:id/history" }

func (h *Handler) Handle(c *gin.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid appointment id"), fault.Public("Id de cita inválido"),
		)

	}

	tenantID := jwt.TenantIDFromContext(c)
	if _, err := db.Query.FindAppointmentByID(c.Request.Context(), h.DB.Primary(), db.FindAppointmentByIDParams{
		ID:       id,
		TenantID: tenantID,
	}); err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("appointment not found"), fault.Public("La cita no existe"),
		)

	}

	history, err := db.Query.FindAppointmentStatusHistory(c.Request.Context(), h.DB.Primary(), db.FindAppointmentStatusHistoryParams{
		AppointmentID: id,
		TenantID:      tenantID,
	})
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to fetch history"))

	}

	result := make([]Response, len(history))
	for i, h := range history {
		var changedBy *string
		if h.ChangedBy.Valid {
			changedBy = &h.ChangedBy.String
		}
		result[i] = Response{
			ID:            h.ID,
			FromStatus:    string(h.FromStatus),
			ToStatus:      string(h.ToStatus),
			ChangedBy:     changedBy,
			ChangedByRole: h.ChangedByRole.String,
			Reason:        h.Reason.String,
			CreatedAt:     h.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, result)
	return nil
}
