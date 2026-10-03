package public_availability_list

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"time"
	"wappiz/internal/services/slotfinder"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/svc/api/internal/publicbooking"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SlotResponse struct {
	StartsAt     time.Time `json:"startsAt"`
	EndsAt       time.Time `json:"endsAt"`
	ResourceID   uuid.UUID `json:"resourceId"`
	ResourceName string    `json:"resourceName"`
}

type Handler struct {
	DB         db.Database
	SlotFinder slotfinder.SlotFinderService
}

func (h *Handler) Method() string { return http.MethodGet }
func (h *Handler) Path() string   { return "/v1/public/tenants/:slug/availability" }

// Handle lists the free slots for a service on one day (in the tenant's
// timezone). Without resourceId it merges the slots of every resource that
// offers the service, so the customer can book "any available" resource.
func (h *Handler) Handle(c *gin.Context) error {
	ctx := c.Request.Context()

	tenant, err := publicbooking.FindTenant(ctx, h.DB, c.Param("slug"))
	if err != nil {
		return err
	}

	q, err := parseQuery(c, tenant.Location, time.Now())
	if err != nil {
		return err
	}

	svc, err := db.Query.FindServiceByID(ctx, h.DB.Primary(), q.serviceID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return fault.Wrap(err, fault.Internal("find service by id"))
	}
	if err != nil || svc.TenantID != tenant.ID || !svc.IsActive {
		return fault.New("service not found",
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("service missing, inactive or owned by another tenant"),
			fault.Public("El servicio no existe"),
		)
	}

	resources, err := db.Query.FindResourcesByServiceID(ctx, h.DB.Primary(), db.FindResourcesByServiceIDParams{
		TenantID:  tenant.ID,
		ServiceID: svc.ID,
	})
	if err != nil {
		return fault.Wrap(err, fault.Internal("find resources by service id"))
	}

	if q.resourceID != uuid.Nil {
		resources = filterResource(resources, q.resourceID)
		if len(resources) == 0 {
			return fault.New("resource not found",
				fault.Code(codes.ErrorsNotFound),
				fault.Internal("resource does not offer service or is inactive"),
				fault.Public("El recurso no presta este servicio"),
			)
		}
	}

	now := time.Now()
	slots := []SlotResponse{}
	for _, r := range resources {
		found, err := h.SlotFinder.FindAvailableSlots(ctx, slotfinder.FindAvailableSlotsParams{
			ResourceID: r.ID,
			Date:       q.date,
			Service: slotfinder.ServiceParam{
				DurationMinutes: svc.DurationMinutes,
				BufferMinutes:   svc.BufferMinutes,
			},
		})
		if err != nil {
			return fault.Wrap(err, fault.Internal("find available slots"))
		}

		for _, s := range found {
			if !s.StartsAt.After(now) {
				continue
			}
			slots = append(slots, SlotResponse{
				StartsAt:     s.StartsAt,
				EndsAt:       s.EndsAt,
				ResourceID:   r.ID,
				ResourceName: r.Name,
			})
		}
	}

	// Resources are already in display order; a stable sort keeps it as
	// the tie-breaker for slots starting at the same time.
	sort.SliceStable(slots, func(i, j int) bool {
		return slots[i].StartsAt.Before(slots[j].StartsAt)
	})

	c.JSON(http.StatusOK, slots)
	return nil
}

type query struct {
	serviceID uuid.UUID
	// resourceID is uuid.Nil when the customer accepts any resource.
	resourceID uuid.UUID
	// date is midnight of the requested day in the tenant's location.
	date time.Time
}

func parseQuery(c *gin.Context, loc *time.Location, now time.Time) (query, error) {
	serviceID, err := uuid.Parse(c.Query("serviceId"))
	if err != nil {
		return query{}, badRequest("invalid serviceId", "El servicio es inválido")
	}

	resourceID := uuid.Nil
	if raw := c.Query("resourceId"); raw != "" {
		resourceID, err = uuid.Parse(raw)
		if err != nil || resourceID == uuid.Nil {
			return query{}, badRequest("invalid resourceId", "El recurso es inválido")
		}
	}

	date, err := time.ParseInLocation("2006-01-02", c.Query("date"), loc)
	if err != nil {
		return query{}, badRequest("invalid date", "La fecha debe tener formato YYYY-MM-DD")
	}

	localNow := now.In(loc)
	today := time.Date(localNow.Year(), localNow.Month(), localNow.Day(), 0, 0, 0, 0, loc)
	if date.Before(today) {
		return query{}, fault.New("date in the past",
			fault.Code(codes.AppErrorsDateInPast),
			fault.Internal("availability requested for a past date"),
			fault.Public("La fecha no puede estar en el pasado"),
		)
	}
	if date.After(today.AddDate(0, 0, publicbooking.BookingWindowDays)) {
		return query{}, badRequest("date beyond booking window",
			fmt.Sprintf("Solo puedes reservar hasta %d días en adelante", publicbooking.BookingWindowDays))
	}

	return query{serviceID: serviceID, resourceID: resourceID, date: date}, nil
}

func filterResource(resources []db.FindResourcesByServiceIDRow, id uuid.UUID) []db.FindResourcesByServiceIDRow {
	for _, r := range resources {
		if r.ID == id {
			return []db.FindResourcesByServiceIDRow{r}
		}
	}
	return nil
}

func badRequest(internal, public string) error {
	return fault.New(internal,
		fault.Code(codes.ErrorsBadRequest),
		fault.Internal(internal),
		fault.Public(public),
	)
}
