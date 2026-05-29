package statemachine

import (
	"context"
	"errors"
	"fmt"
	"wappiz/pkg/datetime"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/whatsapp"
)

func (s *service) sendConfirmation(ctx context.Context, msg IncomingMessage, session db.ConversationSession) error {
	sessionData, err := db.UnmarshalNullableJSONTo[SessionData]([]byte(session.Data))
	if err != nil {
		return fault.Wrap(err, fault.Internal("unmarshal session data"))
	}

	if sessionData.ServiceID == nil || sessionData.ResourceID == nil || sessionData.StartsAt == nil {
		return errors.New("incomplete session data: missing service, resource, or start time")
	}

	svc, err := db.Query.FindServiceByID(ctx, s.db.Primary(), *sessionData.ServiceID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("find service by id"))
	}

	rsc, err := db.Query.FindResourceById(ctx, s.db.Primary(), *sessionData.ResourceID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("find resource by id"))
	}

	customerName := "Cliente"
	if sessionData.ConfirmedName != nil {
		customerName = *sessionData.ConfirmedName
	}

	body := fmt.Sprintf(
		"Resumen de tu cita 📋\n\n"+
			"👤 Cliente:  %s\n"+
			"📌 Servicio: %s (%d min)\n"+
			"💈 Barbero:  %s\n"+
			"📅 Fecha:    %s\n"+
			"💰 Precio:   $%s\n\n"+
			"¿Confirmamos?",
		customerName,
		svc.Name,
		svc.DurationMinutes,
		rsc.Name,
		datetime.FormatTime(*sessionData.StartsAt, "02/01/2006 03:04 PM"),
		svc.Price,
	)

	buttons := []whatsapp.Button{
		{Type: "reply", Reply: whatsapp.ButtonReply{ID: "confirm_yes", Title: "✅ Confirmar"}},
		{Type: "reply", Reply: whatsapp.ButtonReply{ID: "confirm_modify", Title: "✏️ Modificar"}},
		{Type: "reply", Reply: whatsapp.ButtonReply{ID: "confirm_cancel", Title: "❌ Cancelar"}},
	}

	return s.whatsapp.SendButtons(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken, body, buttons)
}
