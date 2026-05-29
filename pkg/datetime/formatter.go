package datetime

import (
	"strings"
	"time"
)

// bogotaLoc is the America/Bogota timezone (UTC-5) used for all formatting.
// Falls back to a fixed-offset zone if the timezone database is unavailable.
var bogotaLoc = func() *time.Location {
	loc, err := time.LoadLocation("America/Bogota")
	if err != nil {
		return time.FixedZone("America/Bogota", -5*60*60)
	}
	return loc
}()

// esWeekdays maps English weekday names to their Spanish equivalents.
var esWeekdays = map[string]string{
	"Monday":    "Lunes",
	"Tuesday":   "Martes",
	"Wednesday": "Miércoles",
	"Thursday":  "Jueves",
	"Friday":    "Viernes",
	"Saturday":  "Sábado",
	"Sunday":    "Domingo",
}

// esMonths maps English month names to their Spanish equivalents.
// Full names and the four abbreviations that differ between the two languages
// are included. Abbreviations that are identical in Spanish (Feb, Mar, Jun,
// Jul, Sep, Oct, Nov) are omitted.
var esMonths = map[string]string{
	"January":   "Enero",
	"February":  "Febrero",
	"March":     "Marzo",
	"April":     "Abril",
	"May":       "Mayo",
	"June":      "Junio",
	"July":      "Julio",
	"August":    "Agosto",
	"September": "Septiembre",
	"October":   "Octubre",
	"November":  "Noviembre",
	"December":  "Diciembre",
	"Jan":       "Ene",
	"Apr":       "Abr",
	"Aug":       "Ago",
	"Dec":       "Dic",
}

// FormatTime formats t using the given Go time layout, converted to the
// America/Bogota timezone, with all English weekday and month names replaced
// by their Spanish equivalents.
func FormatTime(t time.Time, layout string) string {
	s := t.In(bogotaLoc).Format(layout)

	for en, es := range esWeekdays {
		s = strings.ReplaceAll(s, en, es)
	}
	for en, es := range esMonths {
		s = strings.ReplaceAll(s, en, es)
	}

	return s
}
