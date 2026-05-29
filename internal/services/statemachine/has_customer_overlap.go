package statemachine

import (
	"context"
	"strings"
	"time"
	"wappiz/pkg/db"

	"github.com/google/uuid"
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
	if err == nil {
		return false
	}

	msg := err.Error()

	// Handle both legacy resource overlap and customer overlap constraints.
	return strings.Contains(msg, "no_overlap") ||
		strings.Contains(msg, "no_customer_overlap") ||
		strings.Contains(msg, "exclusion constraint")
}
