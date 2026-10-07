// Package plans enforces the limits of a tenant's subscription plan. It is
// the single place every channel (dashboard, public booking page, WhatsApp
// bot) asks before creating plan-limited records, so they cannot drift.
//
// Limits only apply while the billing feature flag is enabled for the
// tenant; with the flag off every tenant is unlimited. This keeps paid plans
// dormant while the payment provider is being replaced.
package plans

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"wappiz/internal/services/featureflags"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"

	"github.com/google/uuid"
)

// Limits applied to tenants without an active subscription.
const (
	freePlanResourceLimit    = 1
	freePlanAppointmentLimit = 30
)

// Service answers whether a tenant's plan allows creating more records.
// Callers depend on the interface so tests can substitute a fake.
type Service interface {
	// EnsureCanCreateResource returns a fault coded
	// [codes.ErrorsForbiddenResourceQuotaExceeded] when the tenant has used
	// every resource its plan allows.
	//
	// tx must be the transaction that inserts the resource: the check locks
	// the tenant row until tx ends, so concurrent creations are serialised
	// and cannot both pass on the same count.
	EnsureCanCreateResource(ctx context.Context, tx db.DBTX, tenantID uuid.UUID) error

	// AppointmentLimit returns the tenant's monthly appointment cap, shaped
	// for [db.Query.IncrementTenantAppointmentCount]: an invalid (null) value
	// means unlimited.
	AppointmentLimit(ctx context.Context, tenantID uuid.UUID) (sql.NullInt32, error)
}

type Config struct {
	DB    db.Database
	Flags featureflags.Service
	// Environment is sandbox or production; plans are stored per environment.
	Environment string
}

type service struct {
	db          db.Database
	flags       featureflags.Service
	environment string
}

func New(cfg Config) Service {
	return &service{
		db:          cfg.DB,
		flags:       cfg.Flags,
		environment: cfg.Environment,
	}
}

func (s *service) EnsureCanCreateResource(ctx context.Context, tx db.DBTX, tenantID uuid.UUID) error {
	if !s.flags.IsEnabled(ctx, featureflags.Billing, tenantID) {
		return nil
	}

	if _, err := db.Query.LockTenantForQuota(ctx, tx, tenantID); err != nil {
		return fault.Wrap(err, fault.Internal("lock tenant for resource quota"))
	}

	features, err := s.activePlanFeatures(ctx, tx, tenantID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("find active plan features"))
	}

	limit := freePlanResourceLimit
	if features != nil {
		if features.MaxResources == nil {
			return nil
		}
		limit = *features.MaxResources
	}

	count, err := db.Query.CountActiveResourcesByTenant(ctx, tx, tenantID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("count active resources by tenant"))
	}

	if count >= int64(limit) {
		return fault.New("resource quota exceeded",
			fault.Code(codes.ErrorsForbiddenResourceQuotaExceeded),
			fault.Internal(fmt.Sprintf("tenant %s has reached the resource limit for their plan", tenantID)),
			fault.Public("Se ha alcanzado el límite de recursos de tu plan. Actualiza tu plan para añadir más recursos."),
		)
	}

	return nil
}

func (s *service) AppointmentLimit(ctx context.Context, tenantID uuid.UUID) (sql.NullInt32, error) {
	if !s.flags.IsEnabled(ctx, featureflags.Billing, tenantID) {
		return sql.NullInt32{}, nil
	}

	features, err := s.activePlanFeatures(ctx, s.db.Primary(), tenantID)
	if err != nil {
		return sql.NullInt32{}, fault.Wrap(err, fault.Internal("find active plan features"))
	}

	if features == nil {
		return appointmentLimitFromInt(freePlanAppointmentLimit)
	}
	if features.MaxAppointmentsPerMonth == nil {
		return sql.NullInt32{}, nil
	}

	return appointmentLimitFromInt(*features.MaxAppointmentsPerMonth)
}

// activePlanFeatures returns the features of the tenant's active plan, or nil
// when the tenant has no active subscription and the free plan applies.
func (s *service) activePlanFeatures(ctx context.Context, q db.DBTX, tenantID uuid.UUID) (*db.PlanFeatures, error) {
	plan, err := db.Query.FindActivePlanByTenant(ctx, q, db.FindActivePlanByTenantParams{
		TenantID:    tenantID,
		Environment: s.environment,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	// json.RawMessage must be converted: the helper's type switch only
	// matches []byte and string, not named byte-slice types.
	features, err := db.UnmarshalNullableJSONTo[db.PlanFeatures]([]byte(plan.Features))
	if err != nil {
		return nil, err
	}

	return &features, nil
}

func appointmentLimitFromInt(limit int) (sql.NullInt32, error) {
	if limit < 0 || limit > math.MaxInt32 {
		return sql.NullInt32{}, fault.New("invalid appointment limit",
			fault.Internal("appointment limit outside int32 range"),
		)
	}

	return sql.NullInt32{Int32: int32(limit), Valid: true}, nil
}
