package appointments_create

import (
	"context"
	"database/sql"
	"errors"
	"math"
	"net/http"
	"time"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"
	"wappiz/pkg/server"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

const freePlanAppointmentLimit = 30

const (
	customerOverlapConstraint = "no_customer_overlap"
	resourceOverlapConstraint = "no_overlap"
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
	DB          db.Database
	Environment string
}

func (h *Handler) Method() string { return http.MethodPost }
func (h *Handler) Path() string   { return "/v1/appointments" }

func (h *Handler) Handle(c *gin.Context) error {
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

	customer, err := db.Query.FindCustomerByID(ctx, h.DB.Primary(), req.CustomerID)
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
			fault.Internal("blocked customer cannot create appointments"),
			fault.Public("El cliente está bloqueado"),
		)
	}

	svc, err := db.Query.FindServiceByID(ctx, h.DB.Primary(), req.ServiceID)
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

	resource, err := db.Query.FindResourceById(ctx, h.DB.Primary(), req.ResourceID)
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

	resourceSupportsService, err := h.resourceSupportsService(ctx, tenantID, req.ResourceID, req.ServiceID)
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

	hasCustomerOverlap, err := db.Query.HasCustomerOverlap(ctx, h.DB.Primary(), db.HasCustomerOverlapParams{
		TenantID:   tenantID,
		CustomerID: req.CustomerID,
		StartsAt:   startsAt,
		EndsAt:     endsAt,
	})
	if err != nil {
		return fault.Wrap(err, fault.Internal("check customer overlap"))
	}
	if hasCustomerOverlap {
		return appointmentOverlapError()
	}

	appointmentID := uuid.New()
	appointmentLimit, err := h.findAppointmentLimit(ctx, tenantID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("find appointment limit"))
	}

	err = db.Tx(ctx, h.DB.Primary(), func(ctx context.Context, txx db.DBTX) error {
		if err := db.Query.InsertAppointment(ctx, txx, db.InsertAppointmentParams{
			ID:             appointmentID,
			TenantID:       tenantID,
			ResourceID:     req.ResourceID,
			ServiceID:      req.ServiceID,
			CustomerID:     req.CustomerID,
			StartsAt:       startsAt,
			EndsAt:         endsAt,
			PriceAtBooking: svc.Price,
		}); err != nil {
			return err
		}

		updated, err := db.Query.IncrementTenantAppointmentCount(ctx, txx, db.IncrementTenantAppointmentCountParams{
			ID:                      tenantID,
			MaxAppointmentsPerMonth: appointmentLimit,
		})
		if err != nil {
			return err
		}
		if updated == 0 {
			return fault.New("plan limit reached",
				fault.Code(codes.AppErrorsPlanLimitReached),
				fault.Internal("plan limit reached"),
				fault.Public("Límite de citas alcanzado"),
			)
		}

		return nil
	})
	if err != nil {
		if isAppointmentOverlapConstraintError(err) {
			return appointmentOverlapError()
		}
		return fault.Wrap(err, fault.Internal("create appointment transaction"))
	}

	c.JSON(http.StatusCreated, Response{ID: appointmentID})
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

func (h *Handler) findAppointmentLimit(ctx context.Context, tenantID uuid.UUID) (sql.NullInt32, error) {
	plan, err := db.Query.FindActivePlanByTenant(ctx, h.DB.Primary(), db.FindActivePlanByTenantParams{
		TenantID:    tenantID,
		Environment: h.Environment,
	})

	limit, limitErr := appointmentLimitFromInt(freePlanAppointmentLimit)
	if limitErr != nil {
		return sql.NullInt32{}, limitErr
	}

	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return sql.NullInt32{}, err
		}
	} else {
		features, err := db.UnmarshalNullableJSONTo[db.PlanFeatures](plan.Features)
		if err != nil {
			return sql.NullInt32{}, err
		}
		if features.MaxAppointmentsPerMonth == nil {
			return sql.NullInt32{}, nil
		}

		limit, limitErr = appointmentLimitFromInt(*features.MaxAppointmentsPerMonth)
		if limitErr != nil {
			return sql.NullInt32{}, limitErr
		}
	}

	return limit, nil
}

func appointmentLimitFromInt(limit int) (sql.NullInt32, error) {
	if limit < 0 || limit > math.MaxInt32 {
		return sql.NullInt32{}, fault.New("invalid appointment limit",
			fault.Internal("appointment limit outside int32 range"),
		)
	}

	return sql.NullInt32{Int32: int32(limit), Valid: true}, nil
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
