package publicbooking

import (
	"strings"
	"wappiz/pkg/codes"
	"wappiz/pkg/fault"
)

// E.164 numbers carry at most 15 digits including the country code; the
// shortest national numbers plus country code are 8.
const (
	minPhoneDigits = 8
	maxPhoneDigits = 15
)

// ParsePhoneNumber normalises a customer-typed international number to the
// digits-only form WhatsApp reports in webhooks (e.g. "573001234567"), so a
// customer booking from the page and from the bot resolves to the same row.
// Visual separators and a leading "+" or "00" are accepted; anything else is
// rejected rather than silently dropped.
func ParsePhoneNumber(raw string) (string, error) {
	s := strings.TrimSpace(raw)
	switch {
	case strings.HasPrefix(s, "+"):
		s = s[1:]
	case strings.HasPrefix(s, "00"):
		s = s[2:]
	}

	var digits strings.Builder
	for _, r := range s {
		switch {
		case r >= '0' && r <= '9':
			digits.WriteRune(r)
		case r == ' ' || r == '-' || r == '.' || r == '(' || r == ')':
		default:
			return "", invalidPhone()
		}
	}

	n := digits.Len()
	if n < minPhoneDigits || n > maxPhoneDigits || strings.HasPrefix(digits.String(), "0") {
		return "", invalidPhone()
	}

	return digits.String(), nil
}

func invalidPhone() error {
	return fault.New("invalid phone number",
		fault.Code(codes.ErrorsBadRequest),
		fault.Internal("phone number is not a valid international number"),
		fault.Public("Ingresa un número de WhatsApp válido con el código de país"),
	)
}
