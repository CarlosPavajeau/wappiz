package handlers

import (
	"wappiz/internal/events"
	"wappiz/pkg/crypto"
	"wappiz/pkg/db"
	"wappiz/pkg/mailer"
	"wappiz/pkg/whatsapp"
)

// Dependencies contains the infrastructure required by domain event handlers.
type Dependencies struct {
	Database db.Database
	Mailer   mailer.Mailer
	Whatsapp whatsapp.Client
	Crypto   *crypto.Service
}

// RegisterAll registers every domain event handler used by the runtime.
// Call it during service startup before the dispatcher is shared with
// goroutines.
func RegisterAll(dispatcher *events.Dispatcher, deps Dependencies) {
	dispatcher.Register(NewAppointmentCanceledEmailHandler(deps.Database, deps.Mailer))
	dispatcher.Register(NewAppointmentCreatedEmailHandler(deps.Database, deps.Mailer))
	dispatcher.Register(NewAppointmentCreatedWhatsAppHandler(deps.Database, deps.Whatsapp, deps.Crypto))
	dispatcher.Register(NewAppointmentRescheduledEmailHandler(deps.Database, deps.Mailer))
	dispatcher.Register(NewAppointmentRescheduledWhatsAppHandler(deps.Database, deps.Whatsapp, deps.Crypto))
}
