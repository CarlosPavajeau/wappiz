package whatsapp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
	"wappiz/pkg/codes"
	"wappiz/pkg/fault"
)

// httpClient is the concrete implementation of [Client] backed by the
// WhatsApp Business Cloud API over HTTP.
type httpClient struct {
	baseURL    string
	apiVersion string
	http       *http.Client
}

// New creates a [Client] initialised with the given [Config].
// The underlying HTTP client is configured with a 10-second timeout.
func New(cfg Config) *httpClient {
	return &httpClient{
		baseURL:    cfg.BaseURL,
		apiVersion: cfg.ApiVersion,
		http:       &http.Client{Timeout: 10 * time.Second},
	}
}

// SendText sends a plain-text WhatsApp message to the recipient identified by to.
func (c *httpClient) SendText(ctx context.Context, to, phoneNumberID, accessToken, body string) error {
	req := SendMessageRequest{
		MessagingProduct: "whatsapp",
		RecipientType:    "individual",
		To:               to,
		Type:             "text",
		Text:             &OutText{Body: body},
	}
	return c.send(ctx, phoneNumberID, accessToken, req)
}

// SendButtons sends an interactive message with quick-reply buttons (max 3).
func (c *httpClient) SendButtons(ctx context.Context, to, phoneNumberID, accessToken, body string, buttons []Button) error {
	req := SendMessageRequest{
		MessagingProduct: "whatsapp",
		RecipientType:    "individual",
		To:               to,
		Type:             "interactive",
		Interactive: &OutInteractive{
			Type:   "button",
			Body:   InteractiveBody{Text: body},
			Action: ButtonAction{Buttons: buttons},
		},
	}
	return c.send(ctx, phoneNumberID, accessToken, req)
}

// SendList sends an interactive list message with selectable rows grouped into
// sections. The list button label is fixed to "Ver opciones".
func (c *httpClient) SendList(ctx context.Context, to, phoneNumberID, accessToken, body string, sections []Section) error {
	req := SendMessageRequest{
		MessagingProduct: "whatsapp",
		RecipientType:    "individual",
		To:               to,
		Type:             "interactive",
		Interactive: &OutInteractive{
			Type: "list",
			Body: InteractiveBody{Text: body},
			Action: ListAction{
				ButtonText: "Ver opciones",
				Sections:   sections,
			},
		},
	}
	return c.send(ctx, phoneNumberID, accessToken, req)
}

// SendTemplate sends a pre-approved template message. Unlike the other send
// methods it is delivered even when the recipient has not messaged the
// business in the last 24 hours.
func (c *httpClient) SendTemplate(ctx context.Context, to, phoneNumberID, accessToken string, tpl Template) error {
	out := &OutTemplate{
		Name:     tpl.Name,
		Language: TemplateLanguage{Code: tpl.Language},
	}
	if len(tpl.BodyParams) > 0 {
		params := make([]TemplateParameter, len(tpl.BodyParams))
		for i, p := range tpl.BodyParams {
			params[i] = TemplateParameter{Type: "text", Text: p}
		}
		out.Components = []TemplateComponent{{Type: "body", Parameters: params}}
	}

	req := SendMessageRequest{
		MessagingProduct: "whatsapp",
		RecipientType:    "individual",
		To:               to,
		Type:             "template",
		Template:         out,
	}
	return c.send(ctx, phoneNumberID, accessToken, req)
}

// send marshals payload to JSON and POSTs it to the Cloud API messages endpoint
// for the given phoneNumberID, authenticated with accessToken.
// Returns an error for any HTTP 4xx/5xx response, wrapping the response body
// for context.
func (c *httpClient) send(ctx context.Context, phoneNumberID, accessToken string, payload interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to marshal request payload"))
	}

	url := fmt.Sprintf("%s/%s/%s/messages", c.baseURL, c.apiVersion, phoneNumberID)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to create HTTP request"))
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return fault.Wrap(err, fault.Internal("HTTP request failed"))
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fault.New(fmt.Sprintf("Cloud API error: %s", string(respBody)),
			fault.Code(codes.AppErrorsInternalUnexpectedError),
			fault.Internal("Cloud API returned error status"),
		)
	}

	return nil
}
