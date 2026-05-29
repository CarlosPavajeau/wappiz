package statemachine

import (
	"context"
	"fmt"
	"wappiz/pkg/datetime"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/whatsapp"
)

func (s *service) handleMyAppointments(ctx context.Context, msg IncomingMessage, customer db.FindCustomerByPhoneNumberRow) error {
	appt, err := db.Query.FindAppointmentsByCustomerID(ctx, s.db.Primary(), db.FindAppointmentsByCustomerIDParams{
		TenantID:   msg.TenantID,
		CustomerID: customer.ID,
	})

	if err != nil {
		return fault.Wrap(err, fault.Internal("find appointments"))
	}

	if len(appt) == 0 {
		buttons := []whatsapp.Button{
			{Type: "reply", Reply: whatsapp.ButtonReply{ID: "action_schedule", Title: "📅 Agendar cita"}},
		}

		return s.whatsapp.SendButtons(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"No tienes citas próximas agendadas 📭\n¿Deseas agendar una?", buttons)
	}

	var customerName string
	if customer.Name.Valid {
		customerName = customer.Name.String
	} else {
		customerName = customer.PhoneNumber
	}

	text := fmt.Sprintf("¡Hola, %s! 👋 Aquí están tus próximas citas:\n", customerName)
	for i, a := range appt {
		date := datetime.FormatTime(a.StartsAt, "Monday 02 Jan")
		timeStr := datetime.FormatTime(a.StartsAt, "03:04 PM")

		text += fmt.Sprintf("\n*%d.* 📌 *%s*\n", i+1, a.ServiceName)
		text += fmt.Sprintf("   🗓️ %s a las %s\n", date, timeStr)
		text += fmt.Sprintf("   👤 Con: %s\n", a.ResourceName)
		text += fmt.Sprintf("   📊 Estado: %s\n", appointmentStatusLabel(string(a.Status)))
	}

	text += "\n💬 Para cancelar una cita, toca el botón *Cancelar cita* en el menú principal."

	return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken, text)
}
