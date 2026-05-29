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
	overrides, err := db.Query.FindResourceScheduleOverrides(ctx, s.db.Primary(), db.FindResourceScheduleOverridesParams{
		ResourceID: params.ResourceID,
		Date:       params.Date,
		Date_2:     params.Date,
	})
	if err != nil {
		return nil, err
	}

	var override *db.FindResourceScheduleOverridesRow
	if len(overrides) > 0 {
		override = &overrides[0]
	}

	if override != nil && override.IsDayOff {
		return nil, nil
	}

	workStart, workEnd, err := s.resolveWorkingHours(ctx, params.ResourceID, params.Date, override)
	if err != nil {
		return nil, err
	}
	if workStart == nil {
		return nil, nil // not a working day
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

	slotDuration := time.Duration(params.Service.DurationMinutes+params.Service.BufferMinutes) * time.Minute
	var available []TimeSlot

	current := *workStart
	for current.Add(time.Duration(params.Service.DurationMinutes)*time.Minute).Before(*workEnd) ||
		current.Add(time.Duration(params.Service.DurationMinutes)*time.Minute).Equal(*workEnd) {

		slotEnd := current.Add(slotDuration)
		if !s.overlapsAny(current, slotEnd, occupied) {
			available = append(available, TimeSlot{
				StartsAt:   current,
				EndsAt:     current.Add(time.Duration(params.Service.DurationMinutes) * time.Minute),
				ResourceID: params.ResourceID,
			})
		}
		current = current.Add(slotDuration)
	}

	return available, nil
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

func (s *service) resolveWorkingHours(ctx context.Context, resourceID uuid.UUID, date time.Time, override *db.FindResourceScheduleOverridesRow) (*time.Time, *time.Time, error) {
	loc := date.Location()

	if override != nil && !override.IsDayOff && override.StartTime.Valid {
		start := parseTimeOnDate(date, override.StartTime.String, loc)
		end := parseTimeOnDate(date, override.EndTime.String, loc)
		return &start, &end, nil
	}

	weeklyHours, err := db.Query.FindResourceWorkingHours(ctx, s.db.Primary(), resourceID)
	if err != nil {
		return nil, nil, err
	}

	dow := int16(date.Weekday())
	for _, wh := range weeklyHours {
		if wh.DayOfWeek == dow && wh.IsActive && wh.StartTime != "" {
			start := parseTimeOnDate(date, wh.StartTime, loc)
			end := parseTimeOnDate(date, wh.EndTime, loc)
			return &start, &end, nil
		}
	}

	return nil, nil, nil
}

func (s *service) overlapsAny(start, end time.Time, occupied []TimeSlot) bool {
	for _, o := range occupied {
		if start.Before(o.EndsAt) && end.After(o.StartsAt) {
			return true
		}
	}
	return false
}

func parseTimeOnDate(date time.Time, t string, loc *time.Location) time.Time {
	parsed, _ := time.Parse("15:04:05", t)
	return time.Date(date.Year(), date.Month(), date.Day(),
		parsed.Hour(), parsed.Minute(), 0, 0, loc)
}
