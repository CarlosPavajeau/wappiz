package phone

import (
	"strings"
	"wappiz/pkg/codes"
	"wappiz/pkg/fault"
)

// Only Colombian mobiles are bookable for now: confirmations go out over
// WhatsApp, and Colombian mobiles are exactly 10 digits starting with 3.
const (
	colombiaDialCode     = "57"
	colombiaMobileDigits = 10
	colombiaMobilePrefix = "3"
)

// Parse normalises a customer-typed Colombian mobile number to the
// digits-only form WhatsApp reports in webhooks (e.g. "573001234567"), so a
// customer booking from the page and from the bot resolves to the same row.
// Visual separators and a leading "+" or "00" are accepted; anything else is
// rejected rather than silently dropped. A bare national number
// ("3001234567") is accepted only without an international prefix, since
// "+300…" would name a different country.
func Parse(raw string) (string, error) {
	s := strings.TrimSpace(raw)
	international := true
	switch {
	case strings.HasPrefix(s, "+"):
		s = s[1:]
	case strings.HasPrefix(s, "00"):
		s = s[2:]
	default:
		international = false
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

	national, ok := strings.CutPrefix(digits.String(), colombiaDialCode)
	if !ok || len(national) != colombiaMobileDigits {
		if international {
			return "", invalidPhone()
		}
		national = digits.String()
	}

	if len(national) != colombiaMobileDigits || !strings.HasPrefix(national, colombiaMobilePrefix) {
		return "", invalidPhone()
	}

	return colombiaDialCode + national, nil
}

func invalidPhone() error {
	return fault.New("invalid phone number",
		fault.Code(codes.ErrorsBadRequest),
		fault.Internal("phone number is not a Colombian mobile number"),
		fault.Public("Ingresa un celular colombiano de 10 dígitos"),
	)
}
