package state_machine

import (
	"context"
	"fmt"
	"wappiz/pkg/datetime"
	"wappiz/pkg/db"
	"wappiz/pkg/whatsapp"
)

func (s *service) handleCancelFlow(ctx context.Context, msg IncomingMessage, customer db.FindCustomerByPhoneNumberRow) error {
	appt, err := db.Query.FindAppointmentsByCustomerID(ctx, s.db.Primary(), db.FindAppointmentsByCustomerIDParams{
		TenantID:   msg.TenantID,
		CustomerID: customer.ID,
	})

	if err != nil {
		return fmt.Errorf("find appointments: %w", err)
	}

	if len(appt) == 0 {
		return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
			"No tienes citas activas para cancelar 📭")
	}

	var rows []whatsapp.ListRow
	for _, a := range appt {
		rows = append(rows, whatsapp.ListRow{
			ID:          "cancel_" + a.ID.String(),
			Title:       datetime.FormatTime(a.StartsAt, "02/01 03:04 PM"),
			Description: fmt.Sprintf("%s · %s", a.ResourceName, a.ServiceName),
		})
	}

	sections := []whatsapp.Section{
		{
			Title: "Elige una cita",
			Rows:  rows,
		},
	}

	return s.whatsapp.SendList(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
		"¿Cuál cita deseas cancelar? 🗓️", sections)
}
