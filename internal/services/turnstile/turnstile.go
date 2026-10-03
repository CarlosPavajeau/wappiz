// Package turnstile verifies Cloudflare Turnstile tokens server-side.
//
// A token proves a human solved the widget for this site only once it is
// validated against Cloudflare's siteverify endpoint with the secret key;
// checking it in the browser alone is trivially bypassed.
package turnstile

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"time"
	"wappiz/pkg/fault"
)

const siteverifyURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

// Verifier validates Turnstile tokens. Callers depend on the interface so
// tests can substitute a fake.
type Verifier interface {
	// Verify reports whether token is a valid, unused Turnstile token.
	// remoteIP is optional and only strengthens Cloudflare's checks.
	Verify(ctx context.Context, token, remoteIP string) (bool, error)
}

type Config struct {
	SecretKey string
}

type verifier struct {
	secretKey string
	http      *http.Client
}

func New(cfg Config) *verifier {
	return &verifier{
		secretKey: cfg.SecretKey,
		http:      &http.Client{Timeout: 5 * time.Second},
	}
}

type siteverifyResponse struct {
	Success    bool     `json:"success"`
	ErrorCodes []string `json:"error-codes"`
}

func (v *verifier) Verify(ctx context.Context, token, remoteIP string) (bool, error) {
	if strings.TrimSpace(token) == "" {
		return false, nil
	}

	form := url.Values{"secret": {v.secretKey}, "response": {token}}
	if remoteIP != "" {
		form.Set("remoteip", remoteIP)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, siteverifyURL, strings.NewReader(form.Encode()))
	if err != nil {
		return false, fault.Wrap(err, fault.Internal("create turnstile siteverify request"))
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := v.http.Do(req)
	if err != nil {
		return false, fault.Wrap(err, fault.Internal("call turnstile siteverify"))
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fault.New("turnstile siteverify failed",
			fault.Internal("turnstile siteverify returned non-200 status"),
		)
	}

	var body siteverifyResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return false, fault.Wrap(err, fault.Internal("decode turnstile siteverify response"))
	}

	return body.Success, nil
}
