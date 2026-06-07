package mailer

import "context"

// Config holds the credentials and sender identity required to initialise a
// [Mailer].
type Config struct {
	ApiKey    string // Resend API key used to authenticate requests.
	FromEmail string // Sender address shown in the From header.
}

// Email represents a single outgoing message.
type Email struct {
	To             string // Recipient email address.
	Subject        string // Email subject line.
	Body           string // HTML body of the email.
	IdempotencyKey string // Optional stable key used to deduplicate retries.
}

// Mailer is the interface for sending transactional emails.
// The concrete implementation is returned by [New]; callers should depend on
// this interface rather than the concrete type to allow test doubles.
type Mailer interface {
	Send(ctx context.Context, email Email) error
}
