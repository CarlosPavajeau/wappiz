package statemachine

import (
	"fmt"
	"time"
	"wappiz/internal/services/slotfinder"
	"wappiz/pkg/codes"
	"wappiz/pkg/fault"
)

const (
	maxDateAttempts = 3
	sessionTTL      = 30 * time.Minute
	freePlanLimit   = 30
)

func appointmentStatusLabel(status string) string {
	switch status {
	case "scheduled":
		return "Agendada ✅"
	case "confirmed":
		return "Confirmada ✅"
	case "checked_in":
		return "En proceso 🔄"
	case "completed":
		return "Completada 🎉"
	case "cancelled":
		return "Cancelada ❌"
	case "no_show":
		return "No asistió ⚠️"
	default:
		return status
	}
}

func buildErrorMessage(err error, input string, suggestions []slotfinder.TimeSlot) string {
	code, ok := fault.GetCode(err)
	if !ok {
		return "Ocurrió un error inesperado. Por favor intenta de nuevo."
	}

	switch code {
	case codes.AppErrorsInvalidFormat:
		return fmt.Sprintf(
			"No pude entender *%s* como una fecha válida 😅\n\n"+
				"Usa este formato:\n*DD/MM HH:mm AM/PM*\n\nEjemplo: *02/03 09:00 AM*", input)
	case codes.AppErrorsDateInPast:
		return "Esa fecha ya pasó 📅 Por favor elige una fecha futura."
	case codes.AppErrorsDayOff:
		return "No encontramos disponibilidad para esa fecha ni para los días cercanos 😔\n\nPor favor intenta con una fecha más adelante."
	case codes.AppErrorsOutsideHours:
		return "Ese horario está fuera del horario de atención de ese día ⏰\n\nEscribe otra hora o fecha y te muestro las opciones disponibles."
	case codes.AppErrorsPlanLimitReached:
		return "Lo sentimos, por ahora no es posible agendar más citas por este medio 😔\nPor favor contacta directamente al negocio."
	case codes.AppErrorsAppointmentOverlap:
		if len(suggestions) == 0 {
			return "Ese horario ya no está disponible 😔 Por favor intenta con otra fecha."
		}
		msg := "Ese horario acaba de ser tomado 😔 Estas son las opciones más cercanas:\n\n"
		for _, s := range suggestions {
			msg += fmt.Sprintf("• %s\n", s.StartsAt.Format("02/01 03:04 PM"))
		}
		return msg
	}
	return "Ocurrió un error inesperado. Por favor intenta de nuevo."
}
