package slotfinder

import (
	"sort"
	"time"
	"wappiz/pkg/db"

	"github.com/google/uuid"
)

// Interval is a half-open-agnostic time window within a single day; Start < End.
type Interval struct {
	Start time.Time
	End   time.Time
}

const dateLayout = "2006-01-02"

// resolveDayIntervals computes the bookable windows for a resource on a date.
// Precedence is order-independent: custom_hours overrides covering the date
// replace the weekly working hours as the base; every time_off override
// covering the date is subtracted from that base (NULL times block the whole
// day). Returns nil when the day is fully blocked or not a working day.
func resolveDayIntervals(
	date time.Time,
	weekly []db.FindResourceWorkingHoursRow,
	overrides []db.FindResourceScheduleOverridesRow,
) []Interval {
	loc := date.Location()

	var custom, blocks []Interval
	for _, o := range overrides {
		if !overrideCoversDate(date, o) {
			continue
		}
		switch o.Kind {
		case db.ScheduleOverrideKindCustomHours:
			custom = append(custom, Interval{
				Start: parseTimeOnDate(date, o.StartTime.String, loc),
				End:   parseTimeOnDate(date, o.EndTime.String, loc),
			})
		case db.ScheduleOverrideKindTimeOff:
			if !o.StartTime.Valid {
				return nil
			}
			blocks = append(blocks, Interval{
				Start: parseTimeOnDate(date, o.StartTime.String, loc),
				End:   parseTimeOnDate(date, o.EndTime.String, loc),
			})
		}
	}

	base := mergeIntervals(custom)
	if len(base) == 0 {
		dow := int16(date.Weekday())
		var weeklyIntervals []Interval
		for _, wh := range weekly {
			if wh.DayOfWeek == dow && wh.IsActive && wh.StartTime != "" {
				weeklyIntervals = append(weeklyIntervals, Interval{
					Start: parseTimeOnDate(date, wh.StartTime, loc),
					End:   parseTimeOnDate(date, wh.EndTime, loc),
				})
			}
		}
		base = mergeIntervals(weeklyIntervals)
	}

	return subtractIntervals(base, mergeIntervals(blocks))
}

// overrideCoversDate compares calendar dates: override date columns carry no
// time component while the requested date is in the tenant location.
func overrideCoversDate(date time.Time, o db.FindResourceScheduleOverridesRow) bool {
	key := date.Format(dateLayout)
	return o.StartDate.Format(dateLayout) <= key && key <= o.EndDate.Format(dateLayout)
}

func mergeIntervals(in []Interval) []Interval {
	if len(in) == 0 {
		return nil
	}
	sorted := make([]Interval, len(in))
	copy(sorted, in)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].Start.Before(sorted[j].Start) })

	merged := []Interval{sorted[0]}
	for _, iv := range sorted[1:] {
		last := &merged[len(merged)-1]
		if !iv.Start.After(last.End) {
			if iv.End.After(last.End) {
				last.End = iv.End
			}
			continue
		}
		merged = append(merged, iv)
	}
	return merged
}

func subtractIntervals(base, blocks []Interval) []Interval {
	var result []Interval
	for _, b := range base {
		segments := []Interval{b}
		for _, block := range blocks {
			var next []Interval
			for _, seg := range segments {
				if !block.Start.Before(seg.End) || !block.End.After(seg.Start) {
					next = append(next, seg)
					continue
				}
				if block.Start.After(seg.Start) {
					next = append(next, Interval{Start: seg.Start, End: block.Start})
				}
				if block.End.Before(seg.End) {
					next = append(next, Interval{Start: block.End, End: seg.End})
				}
			}
			segments = next
		}
		result = append(result, segments...)
	}
	return mergeIntervals(result)
}

// generateSlots steps through each interval in duration+buffer increments.
// A slot is valid when the service duration fits inside the interval (the
// trailing buffer may spill past the interval end) and the slot plus buffer
// does not overlap an occupied slot.
func generateSlots(resourceID uuid.UUID, intervals []Interval, occupied []TimeSlot, service ServiceParam) []TimeSlot {
	duration := time.Duration(service.DurationMinutes) * time.Minute
	step := time.Duration(service.DurationMinutes+service.BufferMinutes) * time.Minute

	var available []TimeSlot
	for _, iv := range intervals {
		current := iv.Start
		for !current.Add(duration).After(iv.End) {
			if !overlapsAny(current, current.Add(step), occupied) {
				available = append(available, TimeSlot{
					StartsAt:   current,
					EndsAt:     current.Add(duration),
					ResourceID: resourceID,
				})
			}
			current = current.Add(step)
		}
	}
	return available
}

func overlapsAny(start, end time.Time, occupied []TimeSlot) bool {
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
