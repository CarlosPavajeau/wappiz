package slotfinder

import (
	"context"
	"time"
	"wappiz/pkg/db"

	"github.com/google/uuid"
)

type service struct {
	db db.Database
}

func New(database db.Database) *service {
	return &service{db: database}
}

func (s *service) FindAvailableSlots(ctx context.Context, params FindAvailableSlotsParams) ([]TimeSlot, error) {
	intervals, err := s.dayIntervals(ctx, params.ResourceID, params.Date)
	if err != nil {
		return nil, err
	}
	if len(intervals) == 0 {
		return nil, nil // not a working day or fully blocked
	}

	dayStart := time.Date(params.Date.Year(), params.Date.Month(), params.Date.Day(), 0, 0, 0, 0, params.Date.Location())
	dayEnd := dayStart.Add(24 * time.Hour)

	occupiedRows, err := db.Query.FindResourceOccupiedSlots(ctx, s.db.Primary(), db.FindResourceOccupiedSlotsParams{
		ResourceID: params.ResourceID,
		StartsAt:   dayStart,
		EndsAt:     dayEnd,
	})
	if err != nil {
		return nil, err
	}

	occupied := make([]TimeSlot, len(occupiedRows))
	for i, r := range occupiedRows {
		occupied[i] = TimeSlot{
			StartsAt:     r.StartsAt,
			EndsAt:       r.EndsAt,
			ResourceID:   params.ResourceID,
			ResourceName: r.ResourceName,
		}
	}

	return generateSlots(params.ResourceID, intervals, occupied, params.Service), nil
}

func (s *service) GetSuggestedSlots(ctx context.Context, params GetSuggestedSlotsParams) ([]TimeSlot, error) {
	var suggestions []TimeSlot
	current := params.From
	maxDays := 7

	for len(suggestions) < 3 && current.Before(params.From.AddDate(0, 0, maxDays)) {
		slots, err := s.FindAvailableSlots(ctx, FindAvailableSlotsParams{
			ResourceID: params.ResourceID,
			Date:       current,
			Service:    params.Service,
		})
		if err != nil {
			return nil, err
		}

		for _, slot := range slots {
			if slot.StartsAt.After(params.From) {
				suggestions = append(suggestions, slot)
				if len(suggestions) == 3 {
					break
				}
			}
		}

		next := current.AddDate(0, 0, 1)
		current = time.Date(next.Year(), next.Month(), next.Day(), 0, 0, 0, 0, current.Location())
	}

	return suggestions, nil
}

// IsBookable reports whether [StartsAt, EndsAt] lies entirely inside one of
// the resource's bookable windows for that day. Overlap with existing
// appointments is enforced separately by the database exclusion constraints.
func (s *service) IsBookable(ctx context.Context, params IsBookableParams) (bool, error) {
	intervals, err := s.dayIntervals(ctx, params.ResourceID, params.StartsAt)
	if err != nil {
		return false, err
	}
	for _, iv := range intervals {
		if !params.StartsAt.Before(iv.Start) && !params.EndsAt.After(iv.End) {
			return true, nil
		}
	}
	return false, nil
}

func (s *service) dayIntervals(ctx context.Context, resourceID uuid.UUID, date time.Time) ([]Interval, error) {
	overrides, err := db.Query.FindResourceScheduleOverrides(ctx, s.db.Primary(), db.FindResourceScheduleOverridesParams{
		ResourceID: resourceID,
		FromDate:   date,
		ToDate:     date,
	})
	if err != nil {
		return nil, err
	}

	weekly, err := db.Query.FindResourceWorkingHours(ctx, s.db.Primary(), resourceID)
	if err != nil {
		return nil, err
	}

	return resolveDayIntervals(date, weekly, overrides), nil
}
