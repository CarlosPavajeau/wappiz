package statemachine

import (
	"context"
	"fmt"
	"wappiz/pkg/datetime"
	"wappiz/pkg/db"

	"github.com/google/uuid"
)

func (s *service) sendAppointmentConfirmed(ctx context.Context, msg IncomingMessage, appointmentID uuid.UUID, customer db.FindCustomerByPhoneNumberRow) error {
	appt, err := db.Query.FindAppointmentByID(ctx, s.db.Primary(), db.FindAppointmentByIDParams{
		ID:       appointmentID,
		TenantID: msg.TenantID,
	})

	if err != nil {
		return err
	}

	svc, err := db.Query.FindServiceByID(ctx, s.db.Primary(), appt.ServiceID)
	if err != nil {
		return err
	}

	rsc, err := db.Query.FindResourceById(ctx, s.db.Primary(), appt.ResourceID)
	if err != nil {
		return err
	}

	customerName := "Cliente"
	if customer.Name.Valid {
		customerName = customer.Name.String
	}

	body := fmt.Sprintf(
		"¡Listo, %s! 🎉 Tu cita está confirmada.\n\n"+
			"📌 %s con %s\n"+
			"📅 %s\n"+
			"Te enviaremos un recordatorio 24 horas antes.\n"+
			"Si necesitas cancelar escríbenos aquí. ¡Hasta pronto! 👋",
		customerName,
		svc.Name,
		rsc.Name,
		datetime.FormatTime(appt.StartsAt, "02/01/2006 03:04 PM"),
	)

	return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken, body)
}
