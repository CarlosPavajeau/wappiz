// Package booking creates appointments on behalf of channels other than the
// WhatsApp bot (the dashboard and the public booking page). It owns every
// rule an appointment must satisfy before it is persisted so each channel
// enforces the same invariants.
package booking

import (
	"context"
	"database/sql"
	"errors"
	"time"
	"wappiz/internal/events"
	"wappiz/internal/services/plans"
	"wappiz/internal/services/slotfinder"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

const (
	customerOverlapConstraint = "no_customer_overlap"
	resourceOverlapConstraint = "no_overlap"
)

type Config struct {
	DB         db.Database
	SlotFinder slotfinder.SlotFinderService
	Publisher  *events.Publisher
	Plans      plans.Service
}

type Service struct {
	db         db.Database
	slotFinder slotfinder.SlotFinderService
	publisher  *events.Publisher
	plans      plans.Service
}

func New(cfg Config) *Service {
	return &Service{
		db:         cfg.DB,
		slotFinder: cfg.SlotFinder,
		publisher:  cfg.Publisher,
		plans:      cfg.Plans,
	}
}

type CreateParams struct {
	TenantID   uuid.UUID
	Customer   Customer
	ResourceID uuid.UUID
	ServiceID  uuid.UUID
	StartsAt   time.Time
	Source     events.AppointmentCreatedSource
}

// Appointment is the confirmed appointment returned by [Service.Create],
// carrying the names callers need to describe it without another lookup.
type Appointment struct {
	ID           uuid.UUID
	StartsAt     time.Time
	EndsAt       time.Time
	ServiceName  string
	ResourceName string
}

// Create validates and persists a confirmed appointment, increments the
// tenant's monthly counter against its plan limit and publishes
// appointment.created, all in one transaction. The customer is resolved
// inside that transaction too, so a rejected booking never creates or
// changes a customer. Every failure a caller can act on is returned as a
// fault with a public message.
func (s *Service) Create(ctx context.Context, p CreateParams) (Appointment, error) {
	if p.StartsAt.Before(time.Now()) {
		return Appointment{}, fault.New("appointment date is in the past",
			fault.Code(codes.AppErrorsDateInPast),
			fault.Internal("startsAt is before now"),
			fault.Public("La fecha de la cita no puede estar en el pasado"),
		)
	}

	svc, err := db.Query.FindServiceByID(ctx, s.db.Primary(), p.ServiceID)
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return Appointment{}, fault.Wrap(err, fault.Internal("find service by id"))
		}
		return Appointment{}, fault.Wrap(err,
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("service not found for tenant"),
			fault.Public("El servicio no existe"),
		)
	}
	if svc.TenantID != p.TenantID {
		return Appointment{}, fault.New("service not found for tenant",
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("service belongs to another tenant"),
			fault.Public("El servicio no existe"),
		)
	}

	resource, err := db.Query.FindResourceById(ctx, s.db.Primary(), p.ResourceID)
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return Appointment{}, fault.Wrap(err, fault.Internal("find resource by id"))
		}
		return Appointment{}, fault.Wrap(err,
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("resource not found for tenant"),
			fault.Public("El recurso no existe"),
		)
	}
	if resource.TenantID != p.TenantID {
		return Appointment{}, fault.New("resource not found for tenant",
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("resource belongs to another tenant"),
			fault.Public("El recurso no existe"),
		)
	}
	if !resource.IsActive {
		return Appointment{}, fault.New("resource not found for tenant",
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("resource is inactive"),
			fault.Public("El recurso no existe"),
		)
	}

	supported, err := s.resourceSupportsService(ctx, p.TenantID, p.ResourceID, p.ServiceID)
	if err != nil {
		return Appointment{}, fault.Wrap(err, fault.Internal("check resource service assignment"))
	}
	if !supported {
		return Appointment{}, fault.New("resource does not support service",
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("resource is not assigned to service"),
			fault.Public("El recurso no presta este servicio"),
		)
	}

	startsAt := p.StartsAt
	endsAt := startsAt.Add(time.Duration(svc.DurationMinutes) * time.Minute)

	tenant, err := db.Query.FindTenantByID(ctx, s.db.Primary(), p.TenantID)
	if err != nil {
		return Appointment{}, fault.Wrap(err, fault.Internal("find tenant by id"))
	}
	loc, err := time.LoadLocation(tenant.Timezone)
	if err != nil {
		return Appointment{}, fault.Wrap(err, fault.Internal("load tenant timezone"))
	}

	bookable, err := s.slotFinder.IsBookable(ctx, slotfinder.IsBookableParams{
		ResourceID: p.ResourceID,
		StartsAt:   startsAt.In(loc),
		EndsAt:     endsAt.In(loc),
	})
	if err != nil {
		return Appointment{}, fault.Wrap(err, fault.Internal("check resource schedule"))
	}
	if !bookable {
		return Appointment{}, fault.New("outside working hours",
			fault.Code(codes.AppErrorsOutsideHours),
			fault.Internal("appointment falls outside resource bookable windows"),
			fault.Public("El recurso no está disponible en ese horario"),
		)
	}

	appointmentLimit, err := s.plans.AppointmentLimit(ctx, p.TenantID)
	if err != nil {
		return Appointment{}, fault.Wrap(err, fault.Internal("find appointment limit"))
	}

	appointmentID := uuid.New()
	err = db.Tx(ctx, s.db.Primary(), func(ctx context.Context, txx db.DBTX) error {
		customer, err := p.Customer.resolve(ctx, txx, p.TenantID)
		if err != nil {
			return err
		}
		if customer.TenantID != p.TenantID {
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

		hasCustomerOverlap, err := db.Query.HasCustomerOverlap(ctx, txx, db.HasCustomerOverlapParams{
			TenantID:   p.TenantID,
			CustomerID: customer.ID,
			StartsAt:   startsAt,
			EndsAt:     endsAt,
		})
		if err != nil {
			return fault.Wrap(err, fault.Internal("check customer overlap"))
		}
		if hasCustomerOverlap {
			return overlapError()
		}

		if err := db.Query.InsertAppointment(ctx, txx, db.InsertAppointmentParams{
			ID:             appointmentID,
			TenantID:       p.TenantID,
			ResourceID:     p.ResourceID,
			ServiceID:      p.ServiceID,
			CustomerID:     customer.ID,
			StartsAt:       startsAt,
			EndsAt:         endsAt,
			PriceAtBooking: svc.Price,
		}); err != nil {
			return err
		}

		updated, err := db.Query.IncrementTenantAppointmentCount(ctx, txx, db.IncrementTenantAppointmentCountParams{
			ID:                      p.TenantID,
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

		evt, err := events.NewAppointmentCreated(events.AppointmentCreatedPayload{
			AppointmentID: appointmentID,
			TenantID:      p.TenantID,
			CustomerID:    customer.ID,
			ServiceID:     p.ServiceID,
			ResourceID:    p.ResourceID,
			StartsAt:      startsAt,
			EndsAt:        endsAt,
			Source:        p.Source,
		})
		if err != nil {
			return fault.Wrap(err, fault.Internal("build appointment.created event"))
		}

		return s.publisher.Publish(ctx, txx, evt)
	})
	if err != nil {
		if isOverlapConstraintError(err) {
			return Appointment{}, overlapError()
		}
		return Appointment{}, fault.Wrap(err, fault.Internal("create appointment transaction"))
	}

	return Appointment{
		ID:           appointmentID,
		StartsAt:     startsAt,
		EndsAt:       endsAt,
		ServiceName:  svc.Name,
		ResourceName: resource.Name,
	}, nil
}

func (s *Service) resourceSupportsService(
	ctx context.Context,
	tenantID uuid.UUID,
	resourceID uuid.UUID,
	serviceID uuid.UUID,
) (bool, error) {
	services, err := db.Query.FindServicesByResourceID(ctx, s.db.Primary(), db.FindServicesByResourceIDParams{
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

func overlapError() error {
	return fault.New("appointment overlap",
		fault.Code(codes.AppErrorsAppointmentOverlap),
		fault.Internal("appointment overlaps existing appointment"),
		fault.Public("El horario seleccionado ya está ocupado"),
	)
}

func isOverlapConstraintError(err error) bool {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return false
	}

	return pgErr.ConstraintName == customerOverlapConstraint ||
		pgErr.ConstraintName == resourceOverlapConstraint
}
