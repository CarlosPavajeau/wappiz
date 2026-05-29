package resources_list_overrides

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
	ID        uuid.UUID `json:"id"`
	Date      string    `json:"date"`
	IsDayOff  bool      `json:"isDayOff"`
	StartTime string    `json:"startTime"`
	EndTime   string    `json:"endTime"`
	Reason    string    `json:"reason"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodGet }
func (h *Handler) Path() string   { return "/v1/resources/:id/overrides" }

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

	from := time.Now()
	to := from.AddDate(0, 0, 30)

	if fromStr := c.Query("from"); fromStr != "" {
		if t, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = t
		}
	}
	if toStr := c.Query("to"); toStr != "" {
		if t, err := time.Parse("2006-01-02", toStr); err == nil {
			to = t
		}
	}

	overrides, err := db.Query.FindResourceScheduleOverrides(c.Request.Context(), h.DB.Primary(), db.FindResourceScheduleOverridesParams{
		ResourceID: id,
		Date:       from,
		Date_2:     to,
	})
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to fetch schedule overrides"))

	}

	response := make([]Response, len(overrides))
	for i, o := range overrides {
		var startTime, endTime string
		if o.StartTime.Valid {
			startTime = o.StartTime.String
		}
		if o.EndTime.Valid {
			endTime = o.EndTime.String
		}

		response[i] = Response{
			ID:        o.ID,
			Date:      o.Date.Format("2006-01-02"),
			IsDayOff:  o.IsDayOff,
			StartTime: startTime,
			EndTime:   endTime,
			Reason:    o.Reason,
		}
	}

	c.JSON(http.StatusOK, response)
	return nil
}
