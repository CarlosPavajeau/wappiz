package statemachine

import (
	"context"
	"errors"
	"time"
	"wappiz/pkg/db"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

const (
	customerOverlapConstraint = "no_customer_overlap"
	resourceOverlapConstraint = "no_overlap"
)

func (s *service) hasCustomerOverlap(
	ctx context.Context,
	tenantID uuid.UUID,
	customerID uuid.UUID,
	startsAt time.Time,
	endsAt time.Time,
) (bool, error) {
	return db.Query.HasCustomerOverlap(ctx, s.db.Primary(), db.HasCustomerOverlapParams{
		TenantID:   tenantID,
		CustomerID: customerID,
		StartsAt:   startsAt,
		EndsAt:     endsAt,
	})
}

func isAppointmentOverlapConstraintError(err error) bool {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return false
	}

	return pgErr.ConstraintName == customerOverlapConstraint ||
		pgErr.ConstraintName == resourceOverlapConstraint
}
