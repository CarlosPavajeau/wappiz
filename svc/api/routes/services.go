package routes

import (
	"wappiz/internal/events"
	"wappiz/internal/services/ratelimit"
	"wappiz/internal/services/slotfinder"
	"wappiz/internal/services/statemachine"
	"wappiz/internal/services/webhookprocessor"
	"wappiz/pkg/crypto"
	"wappiz/pkg/db"
	"wappiz/pkg/mailer"
	"wappiz/pkg/whatsapp"
)

// Services aggregates all dependencies required by API route handlers. It acts
// as a dependency injection container, allowing [Register] to wire up handlers
// without exposing individual dependencies throughout the codebase.
//
// This struct is constructed during server startup and passed to [Register].
// All fields except the optional configuration fields
// must be non-nil for the API to function correctly.
type Services struct {
	// Database provides access to the primary database
	Database db.Database

	// Mailer provides an email client for transactional messages.
	Mailer mailer.Mailer

	// Whatsapp communicates with Whatsapp Business API for messaging.
	Whatsapp whatsapp.Client

	// StateMachine handles conversation state machine for WhatsApp booking flows.
	StateMachine statemachine.StateMachineService

	// SlotFinder resolves bookable windows and validates appointment times
	// against working hours and schedule overrides.
	SlotFinder slotfinder.SlotFinderService

	// Publisher persists domain events raised by route handlers.
	Publisher *events.Publisher

	// WebhookProcessor handles buffered processing of incoming WhatsApp webhook payloads.
	WebhookProcessor webhookprocessor.Service

	// AdminEmail is the destination address for internal admin notifications.
	AdminEmail string

	// AppSecret stores shared secret used to verify webhook signatures.
	AppSecret string

	// Crypto provides AES-GCM encrypt/decrypt for sensitive values at rest (e.g. access tokens).
	Crypto *crypto.Service

	// Ratelimit provides distributed rate limiting across API requests.
	Ratelimit ratelimit.Service

	// Environment can be sandbox or production, used to filter active plans in the database
	Environment string
}
