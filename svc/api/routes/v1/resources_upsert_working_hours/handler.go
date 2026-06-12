package resources_upsert_working_hours

import (
	"context"
	"net/http"
	"sort"
	"time"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"wappiz/pkg/server"
)

type Interval struct {
	StartTime string `json:"startTime" binding:"required"`
	EndTime   string `json:"endTime"   binding:"required"`
}

type Day struct {
	DayOfWeek int        `json:"dayOfWeek" binding:"min=0,max=6"`
	Intervals []Interval `json:"intervals"`
}

// Request replaces the resource's full weekly schedule: a day may carry
// several intervals (gaps between them act as breaks) and days omitted from
// the payload end up with no intervals, i.e. closed.
type Request struct {
	Days []Day `json:"days" binding:"required,dive"`
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

type parsedInterval struct {
	dayOfWeek int16
	start     time.Time
	end       time.Time
}

func parseAndValidate(days []Day) ([]parsedInterval, error) {
	seen := make(map[int]bool, len(days))
	var intervals []parsedInterval

	for _, day := range days {
		if seen[day.DayOfWeek] {
			return nil, fault.New("duplicate day",
				fault.Code(codes.ErrorsBadRequest),
				fault.Internal("dayOfWeek appears more than once"),
				fault.Public("Cada día de la semana solo puede aparecer una vez"),
			)
		}
		seen[day.DayOfWeek] = true

		parsed := make([]parsedInterval, 0, len(day.Intervals))
		for _, iv := range day.Intervals {
			start, err := parseTime(iv.StartTime)
			if err != nil {
				return nil, fault.Wrap(err,
					fault.Code(codes.ErrorsBadRequest),
					fault.Internal("invalid startTime format"),
					fault.Public("El campo 'startTime' debe tener formato HH:MM o HH:MM:SS"),
				)
			}
			end, err := parseTime(iv.EndTime)
			if err != nil {
				return nil, fault.Wrap(err,
					fault.Code(codes.ErrorsBadRequest),
					fault.Internal("invalid endTime format"),
					fault.Public("El campo 'endTime' debe tener formato HH:MM o HH:MM:SS"),
				)
			}
			if !start.Before(end) {
				return nil, fault.New("invalid interval",
					fault.Code(codes.ErrorsBadRequest),
					fault.Internal("interval startTime is not before endTime"),
					fault.Public("La hora de inicio debe ser anterior a la de fin"),
				)
			}
			parsed = append(parsed, parsedInterval{
				dayOfWeek: int16(day.DayOfWeek),
				start:     start,
				end:       end,
			})
		}

		sort.Slice(parsed, func(i, j int) bool { return parsed[i].start.Before(parsed[j].start) })
		for i := 1; i < len(parsed); i++ {
			if parsed[i].start.Before(parsed[i-1].end) {
				return nil, fault.New("overlapping intervals",
					fault.Code(codes.ErrorsBadRequest),
					fault.Internal("working hour intervals overlap within a day"),
					fault.Public("Los intervalos de un mismo día no pueden superponerse"),
				)
			}
		}

		intervals = append(intervals, parsed...)
	}

	return intervals, nil
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

	intervals, err := parseAndValidate(req.Days)
	if err != nil {
		return err
	}

	err = db.Tx(c.Request.Context(), h.DB.Primary(), func(ctx context.Context, txx db.DBTX) error {
		if err := db.Query.DeleteWorkingHoursByResource(ctx, txx, id); err != nil {
			return err
		}
		for _, iv := range intervals {
			if err := db.Query.InsertWorkingHour(ctx, txx, db.InsertWorkingHourParams{
				ID:         uuid.New(),
				ResourceID: id,
				DayOfWeek:  iv.dayOfWeek,
				StartTime:  iv.start,
				EndTime:    iv.end,
				IsActive:   true,
			}); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to replace working hours"))

	}

	c.Status(http.StatusNoContent)
	return nil
}
