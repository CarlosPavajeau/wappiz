package statemachine

import (
	"fmt"
	"strings"
	"time"
	"wappiz/internal/services/slotfinder"
	"wappiz/pkg/codes"
	"wappiz/pkg/fault"
	"wappiz/pkg/flowfield"
)

const (
	maxDateAttempts      = 3
	maxFlowFieldAttempts = 3
	sessionTTL           = 30 * time.Minute

	// maxMessageLength caps any inbound text before a handler sees it. It
	// matches the longest answer a flow field can accept, and is well under
	// WhatsApp's own 4096-character limit.
	maxMessageLength = flowfield.MaxTextLength

	// A customer typing by hand sends a few messages a minute; more than this
	// is a script or a stuck client, and every message costs a DB round trip
	// and possibly an outbound WhatsApp message.
	senderMessagesPerMinute = 20

	// Same bounds as names typed on the public booking page.
	minNameLength = 2
	maxNameLength = 100
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
		var msg strings.Builder
		msg.WriteString("Ese horario acaba de ser tomado 😔 Estas son las opciones más cercanas:\n\n")
		for _, s := range suggestions {
			fmt.Fprintf(&msg, "• %s\n", s.StartsAt.Format("02/01 03:04 PM"))
		}
		return msg.String()
	}
	return "Ocurrió un error inesperado. Por favor intenta de nuevo."
}
