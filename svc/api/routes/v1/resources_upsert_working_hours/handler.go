package resources_upsert_working_hours

import (
	"net/http"
	"time"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"wappiz/pkg/server"
)

type Request struct {
	DayOfWeek int    `json:"dayOfWeek" binding:"min=0,max=6"`
	StartTime string `json:"startTime" binding:"required"`
	EndTime   string `json:"endTime"   binding:"required"`
	IsActive  bool   `json:"isActive"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodPut }
func (h *Handler) Path() string   { return "/v1/resources/:id/working-hours" }

func parseTime(s string) (time.Time, error) {
	if t, err := time.Parse("15:04:05", s); err == nil {
		return t, nil
	}
	return time.Parse("15:04", s)
}

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

	startTime, err := parseTime(req.StartTime)
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid startTime format"),
			fault.Public("El campo 'startTime' debe tener formato HH:MM o HH:MM:SS"),
		)

	}
	endTime, err := parseTime(req.EndTime)
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid endTime format"),
			fault.Public("El campo 'endTime' debe tener formato HH:MM o HH:MM:SS"),
		)

	}

	if err := db.Query.UpsertWorkingHours(c.Request.Context(), h.DB.Primary(), db.UpsertWorkingHoursParams{
		ID:         uuid.New(),
		ResourceID: id,
		DayOfWeek:  int16(req.DayOfWeek),
		StartTime:  startTime,
		EndTime:    endTime,
		IsActive:   req.IsActive,
	}); err != nil {
		return fault.Wrap(err, fault.Internal("failed to upsert working hours"))

	}

	c.Status(http.StatusNoContent)
	return nil
}
