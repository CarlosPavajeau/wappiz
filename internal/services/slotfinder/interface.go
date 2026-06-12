package slotfinder

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type SlotFinderService interface {
	FindAvailableSlots(ctx context.Context, params FindAvailableSlotsParams) ([]TimeSlot, error)
	GetSuggestedSlots(ctx context.Context, params GetSuggestedSlotsParams) ([]TimeSlot, error)
	IsBookable(ctx context.Context, params IsBookableParams) (bool, error)
}

type ServiceParam struct {
	DurationMinutes int32
	BufferMinutes   int32
}

type FindAvailableSlotsParams struct {
	ResourceID uuid.UUID
	Date       time.Time
	Service    ServiceParam
}

type GetSuggestedSlotsParams struct {
	ResourceID uuid.UUID
	From       time.Time
	Service    ServiceParam
}

// IsBookableParams times must be expressed in the tenant's location so the
// requested instant resolves to the correct calendar date.
type IsBookableParams struct {
	ResourceID uuid.UUID
	StartsAt   time.Time
	EndsAt     time.Time
}

type TimeSlot struct {
	StartsAt     time.Time
	EndsAt       time.Time
	ResourceID   uuid.UUID
	ResourceName string
}
