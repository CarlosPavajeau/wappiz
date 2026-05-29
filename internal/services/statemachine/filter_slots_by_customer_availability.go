package statemachine

import (
	"context"
	"wappiz/internal/services/slotfinder"
	"wappiz/pkg/logger"

	"github.com/google/uuid"
)

// filterSlotsByCustomerAvailability removes any slots from the given list that
// overlap an existing active appointment for this customer, returning only the
// slots the customer is genuinely free for.
func (s *service) filterSlotsByCustomerAvailability(
	ctx context.Context,
	tenantID uuid.UUID,
	customerID uuid.UUID,
	slots []slotfinder.TimeSlot,
) []slotfinder.TimeSlot {
	filtered := make([]slotfinder.TimeSlot, 0, len(slots))
	for _, slot := range slots {
		hasOverlap, err := s.hasCustomerOverlap(ctx, tenantID, customerID, slot.StartsAt, slot.EndsAt)
		if err != nil {
			logger.Warn("[scheduling] could not verify customer overlap for suggestion, skipping slot",
				"slot_starts_at", slot.StartsAt,
				"err", err)
			continue
		}
		if !hasOverlap {
			filtered = append(filtered, slot)
		}
	}
	return filtered
}
