package statemachine

import (
	"context"
	"wappiz/internal/services/slotfinder"
	"wappiz/pkg/whatsapp"
)

func (s *service) sendSlotList(ctx context.Context, msg IncomingMessage, slots []slotfinder.TimeSlot) error {
	var rows []whatsapp.ListRow
	for _, slot := range slots {
		rows = append(rows, whatsapp.ListRow{
			ID:          buildSlotID(slot),
			Title:       slot.StartsAt.Format("02/01 03:04 PM"),
			Description: slot.ResourceName,
		})
	}

	sections := []whatsapp.Section{
		{
			Title: "Horarios disponibles",
			Rows:  rows,
		},
	}

	return s.whatsapp.SendList(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
		"Elige un horario disponible 🕐", sections)
}
