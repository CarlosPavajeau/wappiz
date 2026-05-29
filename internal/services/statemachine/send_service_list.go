package statemachine

import (
	"context"
	"fmt"
	"strconv"
	"wappiz/pkg/db"
	"wappiz/pkg/whatsapp"
)

func (s *service) sendServiceList(ctx context.Context, msg IncomingMessage) error {
	svcs, err := db.Query.FindServicesWithAssignedResourceByTenantID(ctx, s.db.Primary(), msg.TenantID)
	if err != nil {
		return err
	}

	var rows []whatsapp.ListRow
	for _, svc := range svcs {
		price, _ := strconv.ParseFloat(svc.Price, 64)
		rows = append(rows, whatsapp.ListRow{
			ID:          svc.ID.String(),
			Title:       svc.Name,
			Description: fmt.Sprintf("%d min · $%.0f", svc.DurationMinutes, price),
		})
	}

	sections := []whatsapp.Section{
		{
			Title: "Servicios disponibles",
			Rows:  rows,
		},
	}

	return s.whatsapp.SendList(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken,
		"¿Qué servicio deseas?", sections)
}
