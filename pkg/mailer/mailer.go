package mailer

import (
	"context"
	"fmt"

	"github.com/resend/resend-go/v3"
)

// mailer is the concrete implementation of [Mailer] backed by the Resend API.
type mailer struct {
	client    *resend.Client
	fromEmail string
}

// New creates a [Mailer] initialised with the given [Config].
func New(cfg Config) *mailer {
	return &mailer{
		client:    resend.NewClient(cfg.ApiKey),
		fromEmail: cfg.FromEmail,
	}
}

// Send dispatches email via the Resend API using the configured sender address.
// It wraps any API error with the "resend:" prefix for easier identification.
func (m *mailer) Send(ctx context.Context, email Email) error {
	params := &resend.SendEmailRequest{
		From:    m.fromEmail,
		To:      []string{email.To},
		Subject: email.Subject,
		Html:    email.Body,
	}

	var err error
	if email.IdempotencyKey == "" {
		_, err = m.client.Emails.SendWithContext(ctx, params)
	} else {
		_, err = m.client.Emails.SendWithOptions(ctx, params, &resend.SendEmailOptions{
			IdempotencyKey: email.IdempotencyKey,
		})
	}
	if err != nil {
		return fmt.Errorf("resend: %w", err)
	}

	return nil
}
