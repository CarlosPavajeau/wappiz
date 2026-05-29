package datetime

import (
	"fmt"
	"strings"
	"time"

	apperrors "wappiz/pkg/errors"
)

// formats lists the time layouts tried in order when parsing user input.
// Each entry omits the year component; ParseDateTime prepends the current year
// before calling [time.ParseInLocation].
var formats = []string{
	"02/01 03:04 PM",
	"02/01 3:04 PM",
	"02/01 03:04PM",
	"02/01 3:04PM",
	"02/01 03:04 AM",
	"02/01 3:04 AM",
}

// ParseDateTime parses a date/time string in day/month and 12-hour clock
// format (e.g. "25/12 3:00 PM") and returns the corresponding [time.Time]
// anchored to the timezone given by loc.
//
// The current year is assumed. If the resulting time falls before the start of
// today in loc, the date is advanced by one year so the result always
// represents a future appointment slot.
//
// It returns [apperrors.ErrInvalidFormat] when the input does not match any of
// the supported layouts.
func ParseDateTime(input string, loc *time.Location) (time.Time, error) {
	input = strings.TrimSpace(input)
	input = strings.Join(strings.Fields(input), " ")
	input = strings.ToUpper(input)

	now := time.Now().In(loc)
	year := now.Year()

	for _, format := range formats {
		fullFormat := fmt.Sprintf("2006/%s", format)
		fullInput := fmt.Sprintf("%d/%s", year, input)

		t, err := time.ParseInLocation(fullFormat, fullInput, loc)
		if err != nil {
			continue
		}

		if t.Before(now.Truncate(24 * time.Hour)) {
			t = t.AddDate(1, 0, 0)
		}

		return t, nil
	}

	return time.Time{}, apperrors.ErrInvalidFormat
}
