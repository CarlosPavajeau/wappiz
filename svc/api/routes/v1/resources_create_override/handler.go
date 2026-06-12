package resources_create_override

import (
	"database/sql"
	"net/http"
	"time"
	"wappiz/internal/services/slotfinder"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"wappiz/pkg/server"
)

type Request struct {
	Kind      string  `json:"kind"      binding:"required,oneof=time_off custom_hours"`
	StartDate string  `json:"startDate" binding:"required"`
	EndDate   string  `json:"endDate"   binding:"required"`
	StartTime *string `json:"startTime"`
	EndTime   *string `json:"endTime"`
	Reason    string  `json:"reason"`
}

type Conflict struct {
	AppointmentID uuid.UUID `json:"appointmentId"`
	StartsAt      time.Time `json:"startsAt"`
	EndsAt        time.Time `json:"endsAt"`
	CustomerName  string    `json:"customerName"`
	ServiceName   string    `json:"serviceName"`
}

type Response struct {
	ID        uuid.UUID  `json:"id"`
	Conflicts []Conflict `json:"conflicts"`
}

type Handler struct {
	DB         db.Database
	SlotFinder slotfinder.SlotFinderService
}

func (h *Handler) Method() string { return http.MethodPost }
func (h *Handler) Path() string   { return "/v1/resources/:id/overrides" }

func nullTime(s *string) sql.NullString {
	if s == nil || *s == "" {
		return sql.NullString{}
	}
	t, err := time.Parse("15:04:05", *s)
	if err != nil {
		t, err = time.Parse("15:04", *s)
		if err != nil {
			return sql.NullString{}
		}
	}
	return sql.NullString{String: t.Format("15:04:05"), Valid: true}
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

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid startDate format"),
			fault.Public("El campo 'startDate' debe tener formato YYYY-MM-DD"),
		)

	}
	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid endDate format"),
			fault.Public("El campo 'endDate' debe tener formato YYYY-MM-DD"),
		)

	}
	if endDate.Before(startDate) {
		return fault.New("invalid date range",
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("endDate is before startDate"),
			fault.Public("La fecha final no puede ser anterior a la inicial"),
		)

	}

	kind := db.ScheduleOverrideKind(req.Kind)
	startTime := nullTime(req.StartTime)
	endTime := nullTime(req.EndTime)

	if startTime.Valid != endTime.Valid {
		return fault.New("unpaired times",
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("startTime and endTime must both be set or both empty"),
			fault.Public("Debes indicar hora de inicio y de fin"),
		)

	}
	if kind == db.ScheduleOverrideKindCustomHours && !startTime.Valid {
		return fault.New("custom hours require times",
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("custom_hours override missing times"),
			fault.Public("Un horario especial requiere hora de inicio y de fin"),
		)

	}
	if startTime.Valid && startTime.String >= endTime.String {
		return fault.New("invalid time range",
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("startTime is not before endTime"),
			fault.Public("La hora de inicio debe ser anterior a la de fin"),
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

	overrideID := uuid.New()
	if err := db.Query.InsertScheduleOverride(c.Request.Context(), h.DB.Primary(), db.InsertScheduleOverrideParams{
		ID:         overrideID,
		ResourceID: id,
		StartDate:  startDate,
		EndDate:    endDate,
		Kind:       kind,
		StartTime:  startTime,
		EndTime:    endTime,
		Reason:     sql.NullString{String: req.Reason, Valid: req.Reason != ""},
	}); err != nil {
		return fault.Wrap(err, fault.Internal("failed to create schedule override"))

	}

	conflicts, err := h.findConflicts(c, tenantID, id, startDate, endDate)
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to scan conflicting appointments"))

	}

	c.JSON(http.StatusCreated, Response{ID: overrideID, Conflicts: conflicts})
	return nil
}

// findConflicts reports existing appointments inside the override period that
// are no longer bookable after the override was inserted. The override stays
// in place either way; the caller surfaces these so the admin can act.
func (h *Handler) findConflicts(c *gin.Context, tenantID, resourceID uuid.UUID, startDate, endDate time.Time) ([]Conflict, error) {
	ctx := c.Request.Context()

	tenant, err := db.Query.FindTenantByID(ctx, h.DB.Primary(), tenantID)
	if err != nil {
		return nil, err
	}
	loc, err := time.LoadLocation(tenant.Timezone)
	if err != nil {
		return nil, err
	}

	periodStart := time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, loc)
	periodEnd := time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 0, 0, 0, 0, loc).AddDate(0, 0, 1)

	appointments, err := db.Query.FindResourceAppointmentsInRange(ctx, h.DB.Primary(), db.FindResourceAppointmentsInRangeParams{
		ResourceID: resourceID,
		RangeStart: periodStart,
		RangeEnd:   periodEnd,
	})
	if err != nil {
		return nil, err
	}

	conflicts := make([]Conflict, 0, len(appointments))
	for _, a := range appointments {
		bookable, err := h.SlotFinder.IsBookable(ctx, slotfinder.IsBookableParams{
			ResourceID: resourceID,
			StartsAt:   a.StartsAt.In(loc),
			EndsAt:     a.EndsAt.In(loc),
		})
		if err != nil {
			return nil, err
		}
		if bookable {
			continue
		}
		conflicts = append(conflicts, Conflict{
			AppointmentID: a.ID,
			StartsAt:      a.StartsAt,
			EndsAt:        a.EndsAt,
			CustomerName:  a.CustomerName,
			ServiceName:   a.ServiceName,
		})
	}

	return conflicts, nil
}
