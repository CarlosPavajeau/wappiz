package statemachine

import "context"

func (s *service) sendDatePrompt(ctx context.Context, msg IncomingMessage) error {
	body := "¿Para qué fecha y hora deseas tu cita? 📅\n\n" +
		"Escribe en este formato:\n*DD/MM HH:mm AM/PM*\n\n" +
		"Ejemplo: *15/03 09:00 AM*\n\n" +
		"Atendemos de lunes a sábado, 9:00 AM – 7:00 PM."
	return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken, body)
}
