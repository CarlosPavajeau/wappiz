package statemachine

import (
	"context"
	"wappiz/pkg/db"
	"wappiz/pkg/whatsapp"
)

func (s *service) sendResourceList(ctx context.Context, msg IncomingMessage, resources []db.FindResourcesByServiceIDRow) error {
	var rows []whatsapp.ListRow
	for _, resource := range resources {
		rows = append(rows, whatsapp.ListRow{
			ID:    resource.ID.String(),
			Title: resource.Name,
		})
	}

	rows = append(rows, whatsapp.ListRow{
		ID:          "resource_any",
		Title:       "Sin preferencia",
		Description: "Te asignamos el primero disponible",
	})

	sections := []whatsapp.Section{
		{
			Title: "Recursos disponibles",
			Rows:  rows,
		},
	}

	return s.whatsapp.SendList(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
		"¿Con quién deseas tu cita?", sections)
}
