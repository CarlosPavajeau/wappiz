package slotfinder

import (
	"database/sql"
	"testing"
	"time"
	"wappiz/pkg/db"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

// monday is 2026-06-15, a Monday, in a fixed non-UTC location.
var testLoc = time.FixedZone("UTC-5", -5*60*60)
var monday = time.Date(2026, 6, 15, 0, 0, 0, 0, testLoc)

func at(date time.Time, hour, min int) time.Time {
	return time.Date(date.Year(), date.Month(), date.Day(), hour, min, 0, 0, date.Location())
}

func weeklyRow(dow int16, start, end string, active bool) db.FindResourceWorkingHoursRow {
	return db.FindResourceWorkingHoursRow{
		ID:        uuid.New(),
		DayOfWeek: dow,
		StartTime: start,
		EndTime:   end,
		IsActive:  active,
	}
}

func overrideRow(kind db.ScheduleOverrideKind, startDate, endDate time.Time, startTime, endTime string) db.FindResourceScheduleOverridesRow {
	row := db.FindResourceScheduleOverridesRow{
		ID:        uuid.New(),
		StartDate: startDate,
		EndDate:   endDate,
		Kind:      kind,
	}
	if startTime != "" {
		row.StartTime = sql.NullString{String: startTime, Valid: true}
		row.EndTime = sql.NullString{String: endTime, Valid: true}
	}
	return row
}

func date(y int, m time.Month, d int) time.Time {
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}

func TestMergeIntervals(t *testing.T) {
	t.Run("empty", func(t *testing.T) {
		require.Nil(t, mergeIntervals(nil))
	})

	t.Run("disjoint stay separate", func(t *testing.T) {
		in := []Interval{
			{Start: at(monday, 13, 0), End: at(monday, 18, 0)},
			{Start: at(monday, 8, 0), End: at(monday, 12, 0)},
		}
		merged := mergeIntervals(in)
		require.Len(t, merged, 2)
		require.Equal(t, at(monday, 8, 0), merged[0].Start)
		require.Equal(t, at(monday, 12, 0), merged[0].End)
		require.Equal(t, at(monday, 13, 0), merged[1].Start)
	})

	t.Run("overlapping merge", func(t *testing.T) {
		in := []Interval{
			{Start: at(monday, 8, 0), End: at(monday, 12, 0)},
			{Start: at(monday, 11, 0), End: at(monday, 14, 0)},
		}
		merged := mergeIntervals(in)
		require.Len(t, merged, 1)
		require.Equal(t, at(monday, 8, 0), merged[0].Start)
		require.Equal(t, at(monday, 14, 0), merged[0].End)
	})

	t.Run("adjacent merge", func(t *testing.T) {
		in := []Interval{
			{Start: at(monday, 8, 0), End: at(monday, 12, 0)},
			{Start: at(monday, 12, 0), End: at(monday, 14, 0)},
		}
		merged := mergeIntervals(in)
		require.Len(t, merged, 1)
		require.Equal(t, at(monday, 8, 0), merged[0].Start)
		require.Equal(t, at(monday, 14, 0), merged[0].End)
	})

	t.Run("contained absorbed", func(t *testing.T) {
		in := []Interval{
			{Start: at(monday, 8, 0), End: at(monday, 18, 0)},
			{Start: at(monday, 10, 0), End: at(monday, 11, 0)},
		}
		merged := mergeIntervals(in)
		require.Len(t, merged, 1)
		require.Equal(t, at(monday, 8, 0), merged[0].Start)
		require.Equal(t, at(monday, 18, 0), merged[0].End)
	})
}

func TestSubtractIntervals(t *testing.T) {
	base := []Interval{{Start: at(monday, 8, 0), End: at(monday, 18, 0)}}

	t.Run("middle block splits", func(t *testing.T) {
		out := subtractIntervals(base, []Interval{{Start: at(monday, 12, 0), End: at(monday, 13, 0)}})
		require.Len(t, out, 2)
		require.Equal(t, at(monday, 8, 0), out[0].Start)
		require.Equal(t, at(monday, 12, 0), out[0].End)
		require.Equal(t, at(monday, 13, 0), out[1].Start)
		require.Equal(t, at(monday, 18, 0), out[1].End)
	})

	t.Run("trailing block trims", func(t *testing.T) {
		out := subtractIntervals(base, []Interval{{Start: at(monday, 15, 0), End: at(monday, 18, 0)}})
		require.Len(t, out, 1)
		require.Equal(t, at(monday, 8, 0), out[0].Start)
		require.Equal(t, at(monday, 15, 0), out[0].End)
	})

	t.Run("exact cover removes", func(t *testing.T) {
		out := subtractIntervals(base, []Interval{{Start: at(monday, 8, 0), End: at(monday, 18, 0)}})
		require.Empty(t, out)
	})

	t.Run("disjoint block is noop", func(t *testing.T) {
		out := subtractIntervals(base, []Interval{{Start: at(monday, 19, 0), End: at(monday, 20, 0)}})
		require.Equal(t, base, out)
	})

	t.Run("no blocks", func(t *testing.T) {
		require.Equal(t, base, subtractIntervals(base, nil))
	})
}

func TestResolveDayIntervals(t *testing.T) {
	t.Run("lunch gap via multi-interval weekly hours", func(t *testing.T) {
		weekly := []db.FindResourceWorkingHoursRow{
			weeklyRow(1, "08:00:00", "12:00:00", true),
			weeklyRow(1, "13:00:00", "18:00:00", true),
		}
		out := resolveDayIntervals(monday, weekly, nil)
		require.Len(t, out, 2)
		require.Equal(t, at(monday, 8, 0), out[0].Start)
		require.Equal(t, at(monday, 12, 0), out[0].End)
		require.Equal(t, at(monday, 13, 0), out[1].Start)
		require.Equal(t, at(monday, 18, 0), out[1].End)
	})

	t.Run("multi-day vacation blocks whole days in range", func(t *testing.T) {
		weekly := []db.FindResourceWorkingHoursRow{weeklyRow(1, "08:00:00", "18:00:00", true)}
		vacation := []db.FindResourceScheduleOverridesRow{
			overrideRow(db.ScheduleOverrideKindTimeOff, date(2026, 6, 10), date(2026, 6, 20), "", ""),
		}
		require.Nil(t, resolveDayIntervals(monday, weekly, vacation))

		afterVacation := monday.AddDate(0, 0, 7) // monday 2026-06-22
		out := resolveDayIntervals(afterVacation, weekly, vacation)
		require.Len(t, out, 1)
		require.Equal(t, at(afterVacation, 8, 0), out[0].Start)
	})

	t.Run("partial-day time off trims window", func(t *testing.T) {
		weekly := []db.FindResourceWorkingHoursRow{weeklyRow(1, "08:00:00", "18:00:00", true)}
		overrides := []db.FindResourceScheduleOverridesRow{
			overrideRow(db.ScheduleOverrideKindTimeOff, date(2026, 6, 15), date(2026, 6, 15), "15:00:00", "18:00:00"),
		}
		out := resolveDayIntervals(monday, weekly, overrides)
		require.Len(t, out, 1)
		require.Equal(t, at(monday, 8, 0), out[0].Start)
		require.Equal(t, at(monday, 15, 0), out[0].End)
	})

	t.Run("custom hours replace weekly hours", func(t *testing.T) {
		weekly := []db.FindResourceWorkingHoursRow{weeklyRow(1, "08:00:00", "18:00:00", true)}
		overrides := []db.FindResourceScheduleOverridesRow{
			overrideRow(db.ScheduleOverrideKindCustomHours, date(2026, 6, 15), date(2026, 6, 15), "10:00:00", "14:00:00"),
		}
		out := resolveDayIntervals(monday, weekly, overrides)
		require.Len(t, out, 1)
		require.Equal(t, at(monday, 10, 0), out[0].Start)
		require.Equal(t, at(monday, 14, 0), out[0].End)
	})

	t.Run("time off subtracts from custom hours", func(t *testing.T) {
		overrides := []db.FindResourceScheduleOverridesRow{
			overrideRow(db.ScheduleOverrideKindCustomHours, date(2026, 6, 15), date(2026, 6, 15), "10:00:00", "14:00:00"),
			overrideRow(db.ScheduleOverrideKindTimeOff, date(2026, 6, 15), date(2026, 6, 15), "12:00:00", "13:00:00"),
		}
		out := resolveDayIntervals(monday, nil, overrides)
		require.Len(t, out, 2)
		require.Equal(t, at(monday, 10, 0), out[0].Start)
		require.Equal(t, at(monday, 12, 0), out[0].End)
		require.Equal(t, at(monday, 13, 0), out[1].Start)
		require.Equal(t, at(monday, 14, 0), out[1].End)
	})

	t.Run("multiple custom hours rows give multiple intervals", func(t *testing.T) {
		overrides := []db.FindResourceScheduleOverridesRow{
			overrideRow(db.ScheduleOverrideKindCustomHours, date(2026, 6, 15), date(2026, 6, 15), "08:00:00", "11:00:00"),
			overrideRow(db.ScheduleOverrideKindCustomHours, date(2026, 6, 15), date(2026, 6, 15), "14:00:00", "17:00:00"),
		}
		out := resolveDayIntervals(monday, nil, overrides)
		require.Len(t, out, 2)
	})

	t.Run("override range spanning weekend", func(t *testing.T) {
		// Weekly hours on Friday (5) and Monday (1) only.
		weekly := []db.FindResourceWorkingHoursRow{
			weeklyRow(5, "08:00:00", "18:00:00", true),
			weeklyRow(1, "08:00:00", "18:00:00", true),
		}
		// Friday 2026-06-12 .. Monday 2026-06-15 off.
		vacation := []db.FindResourceScheduleOverridesRow{
			overrideRow(db.ScheduleOverrideKindTimeOff, date(2026, 6, 12), date(2026, 6, 15), "", ""),
		}
		friday := monday.AddDate(0, 0, -3)
		saturday := monday.AddDate(0, 0, -2)
		nextMonday := monday.AddDate(0, 0, 7)

		require.Nil(t, resolveDayIntervals(friday, weekly, vacation))
		require.Nil(t, resolveDayIntervals(saturday, weekly, vacation))
		require.Nil(t, resolveDayIntervals(monday, weekly, vacation))
		require.Len(t, resolveDayIntervals(nextMonday, weekly, vacation), 1)
	})

	t.Run("inactive weekly rows ignored", func(t *testing.T) {
		weekly := []db.FindResourceWorkingHoursRow{weeklyRow(1, "08:00:00", "18:00:00", false)}
		require.Nil(t, resolveDayIntervals(monday, weekly, nil))
	})

	t.Run("day without weekly rows is closed", func(t *testing.T) {
		weekly := []db.FindResourceWorkingHoursRow{weeklyRow(2, "08:00:00", "18:00:00", true)}
		require.Nil(t, resolveDayIntervals(monday, weekly, nil))
	})

	t.Run("override outside date is ignored", func(t *testing.T) {
		weekly := []db.FindResourceWorkingHoursRow{weeklyRow(1, "08:00:00", "18:00:00", true)}
		overrides := []db.FindResourceScheduleOverridesRow{
			overrideRow(db.ScheduleOverrideKindTimeOff, date(2026, 6, 16), date(2026, 6, 17), "", ""),
		}
		out := resolveDayIntervals(monday, weekly, overrides)
		require.Len(t, out, 1)
	})
}

func TestGenerateSlots(t *testing.T) {
	resourceID := uuid.New()

	t.Run("slots never span the lunch gap", func(t *testing.T) {
		intervals := []Interval{
			{Start: at(monday, 10, 0), End: at(monday, 12, 0)},
			{Start: at(monday, 13, 0), End: at(monday, 18, 0)},
		}
		slots := generateSlots(resourceID, intervals, nil, ServiceParam{DurationMinutes: 60})

		var starts []time.Time
		for _, s := range slots {
			starts = append(starts, s.StartsAt)
		}
		require.Equal(t, []time.Time{
			at(monday, 10, 0), at(monday, 11, 0),
			at(monday, 13, 0), at(monday, 14, 0), at(monday, 15, 0), at(monday, 16, 0), at(monday, 17, 0),
		}, starts)
	})

	t.Run("occupied slots excluded", func(t *testing.T) {
		intervals := []Interval{{Start: at(monday, 8, 0), End: at(monday, 10, 0)}}
		occupied := []TimeSlot{{StartsAt: at(monday, 8, 0), EndsAt: at(monday, 9, 0)}}
		slots := generateSlots(resourceID, intervals, occupied, ServiceParam{DurationMinutes: 60})
		require.Len(t, slots, 1)
		require.Equal(t, at(monday, 9, 0), slots[0].StartsAt)
	})

	t.Run("buffer advances the step", func(t *testing.T) {
		intervals := []Interval{{Start: at(monday, 8, 0), End: at(monday, 10, 0)}}
		slots := generateSlots(resourceID, intervals, nil, ServiceParam{DurationMinutes: 45, BufferMinutes: 15})
		require.Len(t, slots, 2)
		require.Equal(t, at(monday, 8, 0), slots[0].StartsAt)
		require.Equal(t, at(monday, 8, 45), slots[0].EndsAt)
		require.Equal(t, at(monday, 9, 0), slots[1].StartsAt)
	})

	t.Run("slot must fit inside interval", func(t *testing.T) {
		intervals := []Interval{{Start: at(monday, 8, 0), End: at(monday, 8, 30)}}
		slots := generateSlots(resourceID, intervals, nil, ServiceParam{DurationMinutes: 60})
		require.Empty(t, slots)
	})
}
