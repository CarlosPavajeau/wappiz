package appointments_reschedule

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"time"
	"wappiz/internal/events"
	"wappiz/internal/services/slotfinder"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"
	"wappiz/pkg/server"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

const (
	customerOverlapConstraint = "no_customer_overlap"
	resourceOverlapConstraint = "no_overlap"
)

type Request struct {
	StartsAt time.Time `json:"startsAt" binding:"required"`
}

type Handler struct {
	DB         db.Database
	Publisher  *events.Publisher
	SlotFinder slotfinder.SlotFinderService
}

func (h *Handler) Method() string { return http.MethodPut }
func (h *Handler) Path() string   { return "/v1/appointments/:id/reschedule" }

func (h *Handler) Handle(c *gin.Context) error {
	appointmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid appointment id"),
			fault.Public("Id de cita inválido"),
		)
	}

	req, err := server.BindBody[Request](c)
	if err != nil {
		return err
	}

	if req.StartsAt.Before(time.Now()) {
		return fault.New("appointment date is in the past",
			fault.Code(codes.AppErrorsDateInPast),
			fault.Internal("startsAt is before now"),
			fault.Public("La fecha de la cita no puede estar en el pasado"),
		)
	}

	tenantID := jwt.TenantIDFromContext(c)
	ctx := c.Request.Context()

	appointment, err := db.Query.FindAppointmentByID(ctx, h.DB.Primary(), db.FindAppointmentByIDParams{
		ID:       appointmentID,
		TenantID: tenantID,
	})
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return fault.Wrap(err, fault.Internal("find appointment by id"))
		}
		return fault.Wrap(err,
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("appointment not found"),
			fault.Public("La cita no existe"),
		)
	}
	if appointment.Status != db.AppointmentStatusConfirmed {
		return fault.New("appointment is not confirmed",
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("only confirmed appointments can be rescheduled"),
			fault.Public("Solo se pueden reagendar citas confirmadas"),
		)
	}

	customer, err := db.Query.FindCustomerByID(ctx, h.DB.Primary(), appointment.CustomerID)
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return fault.Wrap(err, fault.Internal("find customer by id"))
		}
		return fault.Wrap(err,
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("customer not found for tenant"),
			fault.Public("El cliente no existe"),
		)
	}
	if customer.TenantID != tenantID {
		return fault.New("customer not found for tenant",
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("customer belongs to another tenant"),
			fault.Public("El cliente no existe"),
		)
	}
	if customer.IsBlocked {
		return fault.New("customer is blocked",
			fault.Code(codes.AppErrorsClientBlocked),
			fault.Internal("blocked customer cannot reschedule appointments"),
			fault.Public("El cliente está bloqueado"),
		)
	}

	svc, err := db.Query.FindServiceByID(ctx, h.DB.Primary(), appointment.ServiceID)
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return fault.Wrap(err, fault.Internal("find service by id"))
		}
		return fault.Wrap(err,
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("service not found for tenant"),
			fault.Public("El servicio no existe"),
		)
	}
	if svc.TenantID != tenantID {
		return fault.New("service not found for tenant",
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("service belongs to another tenant"),
			fault.Public("El servicio no existe"),
		)
	}

	resource, err := db.Query.FindResourceById(ctx, h.DB.Primary(), appointment.ResourceID)
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return fault.Wrap(err, fault.Internal("find resource by id"))
		}
		return fault.Wrap(err,
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("resource not found for tenant"),
			fault.Public("El recurso no existe"),
		)
	}
	if resource.TenantID != tenantID {
		return fault.New("resource not found for tenant",
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("resource belongs to another tenant"),
			fault.Public("El recurso no existe"),
		)
	}
	if !resource.IsActive {
		return fault.New("resource not found for tenant",
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("resource is inactive"),
			fault.Public("El recurso no está disponible"),
		)
	}

	resourceSupportsService, err := h.resourceSupportsService(ctx, tenantID, appointment.ResourceID, appointment.ServiceID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("check resource service assignment"))
	}
	if !resourceSupportsService {
		return fault.New("resource does not support service",
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("resource is not assigned to service"),
			fault.Public("El recurso no presta este servicio"),
		)
	}

	startsAt := req.StartsAt
	endsAt := startsAt.Add(time.Duration(svc.DurationMinutes) * time.Minute)

	tenant, err := db.Query.FindTenantByID(ctx, h.DB.Primary(), tenantID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("find tenant by id"))
	}
	loc, err := time.LoadLocation(tenant.Timezone)
	if err != nil {
		return fault.Wrap(err, fault.Internal("load tenant timezone"))
	}

	bookable, err := h.SlotFinder.IsBookable(ctx, slotfinder.IsBookableParams{
		ResourceID: appointment.ResourceID,
		StartsAt:   startsAt.In(loc),
		EndsAt:     endsAt.In(loc),
	})
	if err != nil {
		return fault.Wrap(err, fault.Internal("check resource schedule"))
	}
	if !bookable {
		return fault.New("outside working hours",
			fault.Code(codes.AppErrorsOutsideHours),
			fault.Internal("appointment falls outside resource bookable windows"),
			fault.Public("El recurso no está disponible en ese horario"),
		)
	}

	hasCustomerOverlap, err := db.Query.HasCustomerOverlapExcludingAppointment(ctx, h.DB.Primary(), db.HasCustomerOverlapExcludingAppointmentParams{
		TenantID:              tenantID,
		CustomerID:            appointment.CustomerID,
		ExcludedAppointmentID: appointmentID,
		StartsAt:              startsAt,
		EndsAt:                endsAt,
	})
	if err != nil {
		return fault.Wrap(err, fault.Internal("check customer overlap"))
	}
	if hasCustomerOverlap {
		return appointmentOverlapError()
	}

	err = db.Tx(ctx, h.DB.Primary(), func(ctx context.Context, txx db.DBTX) error {
		updated, err := db.Query.RescheduleAppointment(ctx, txx, db.RescheduleAppointmentParams{
			StartsAt:   startsAt,
			EndsAt:     endsAt,
			ID:         appointmentID,
			TenantID:   tenantID,
			CustomerID: appointment.CustomerID,
		})
		if err != nil {
			return err
		}
		if updated == 0 {
			return fault.New("appointment not rescheduled",
				fault.Internal("confirmed appointment not found for reschedule"),
				fault.Public("No pudimos reagendar esta cita. Por favor intenta de nuevo."),
			)
		}

		if h.Publisher == nil {
			return nil
		}

		evt, evtErr := events.NewAppointmentRescheduled(events.AppointmentRescheduledPayload{
			AppointmentID:    appointmentID,
			TenantID:         tenantID,
			CustomerID:       appointment.CustomerID,
			ServiceID:        appointment.ServiceID,
			ResourceID:       appointment.ResourceID,
			PreviousStartsAt: appointment.StartsAt,
			PreviousEndsAt:   appointment.EndsAt,
			StartsAt:         startsAt,
			EndsAt:           endsAt,
		})
		if evtErr != nil {
			return fault.Wrap(evtErr, fault.Internal("build appointment.rescheduled event"))
		}

		return h.Publisher.Publish(ctx, txx, evt)
	})
	if err != nil {
		if isAppointmentOverlapConstraintError(err) {
			return appointmentOverlapError()
		}
		return fault.Wrap(err, fault.Internal("reschedule appointment transaction"))
	}

	c.Status(http.StatusNoContent)
	return nil
}

func (h *Handler) resourceSupportsService(
	ctx context.Context,
	tenantID uuid.UUID,
	resourceID uuid.UUID,
	serviceID uuid.UUID,
) (bool, error) {
	services, err := db.Query.FindServicesByResourceID(ctx, h.DB.Primary(), db.FindServicesByResourceIDParams{
		TenantID:   tenantID,
		ResourceID: resourceID,
	})
	if err != nil {
		return false, err
	}

	for _, svc := range services {
		if svc.ID == serviceID {
			return true, nil
		}
	}

	return false, nil
}

func appointmentOverlapError() error {
	return fault.New("appointment overlap",
		fault.Code(codes.AppErrorsAppointmentOverlap),
		fault.Internal("appointment overlaps existing appointment"),
		fault.Public("El horario seleccionado ya está ocupado"),
	)
}

func isAppointmentOverlapConstraintError(err error) bool {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return false
	}

	return pgErr.ConstraintName == customerOverlapConstraint ||
		pgErr.ConstraintName == resourceOverlapConstraint
}
