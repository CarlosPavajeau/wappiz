package mailer

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/resend/resend-go/v3"
	"github.com/stretchr/testify/require"
)

type roundTripperFunc func(*http.Request) (*http.Response, error)

func (fn roundTripperFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return fn(request)
}

func TestSendUsesIdempotencyKey(t *testing.T) {
	var receivedKey string
	httpClient := &http.Client{Transport: roundTripperFunc(func(request *http.Request) (*http.Response, error) {
		receivedKey = request.Header.Get("Idempotency-Key")
		return &http.Response{
			StatusCode: http.StatusOK,
			Header:     make(http.Header),
			Body:       io.NopCloser(strings.NewReader(`{"id":"email-id"}`)),
		}, nil
	})}
	client := resend.NewCustomClient(httpClient, "api-key")
	mailer := &mailer{client: client, fromEmail: "from@example.com"}

	err := mailer.Send(context.Background(), Email{
		To:             "to@example.com",
		Subject:        "subject",
		Body:           "body",
		IdempotencyKey: "stable-key",
	})

	require.NoError(t, err)
	require.Equal(t, "stable-key", receivedKey)
}
