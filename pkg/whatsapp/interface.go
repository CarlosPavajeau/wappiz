// Package whatsapp provides a client for sending messages through the
// WhatsApp Business Cloud API and types for decoding incoming webhook payloads.
//
// Create a [Client] with [New], then call the appropriate send method depending
// on the message type needed:
//
//	c := whatsapp.New(whatsapp.Config{
//	    BaseURL:    "https://graph.facebook.com",
//	    ApiVersion: "v19.0",
//	})
//
//	// Plain text
//	err := c.SendText(ctx, recipientPhone, phoneNumberID, accessToken, "Hello!")
//
//	// Interactive buttons (max 3)
//	err := c.SendButtons(ctx, recipientPhone, phoneNumberID, accessToken, "Pick one:", buttons)
//
//	// Interactive list (max 10 rows per section)
//	err := c.SendList(ctx, recipientPhone, phoneNumberID, accessToken, "Choose a slot:", sections)
//
//	// Pre-approved template (works outside the 24h customer service window)
//	err := c.SendTemplate(ctx, recipientPhone, phoneNumberID, accessToken, whatsapp.Template{
//	    Name: "appointment_confirmed", Language: "es", BodyParams: []string{"Ana"},
//	})
//
// Each send method requires the phoneNumberID and accessToken of the tenant's
// WhatsApp Business Account, allowing a single client instance to send on
// behalf of multiple tenants.
//
// Incoming webhook events are represented by [WebhookPayload] and its nested
// types, which mirror the structure of the Cloud API webhook JSON.
package whatsapp

import "context"

// Config holds the base URL and API version used to build WhatsApp Cloud API
// request URLs (e.g. https://graph.facebook.com/v19.0/<phoneNumberID>/messages).
type Config struct {
	BaseURL    string // Base URL of the WhatsApp Cloud API (e.g. "https://graph.facebook.com").
	ApiVersion string // API version segment in the request path (e.g. "v19.0").
}

// Client is the interface for sending WhatsApp messages. The concrete
// implementation is returned by [New]; callers should depend on this interface
// to allow test doubles.
type Client interface {
	// SendText sends a plain-text message to the recipient.
	SendText(ctx context.Context, to, phoneNumberID, accessToken, body string) error
	// SendButtons sends an interactive message with up to 3 quick-reply buttons.
	SendButtons(ctx context.Context, to, phoneNumberID, accessToken, body string, buttons []Button) error
	// SendList sends an interactive list message with selectable rows grouped
	// into sections (up to 10 rows per section).
	SendList(ctx context.Context, to, phoneNumberID, accessToken, body string, sections []Section) error
	// SendTemplate sends a pre-approved template message. It is the only
	// send method allowed outside the 24-hour customer service window.
	SendTemplate(ctx context.Context, to, phoneNumberID, accessToken string, tpl Template) error
}
