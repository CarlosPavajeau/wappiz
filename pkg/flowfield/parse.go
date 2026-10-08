package flowfield

import (
	"fmt"
	"net/mail"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
	"wappiz/pkg/phone"
)

const (
	maxEmailLength    = 254
	minDocumentDigits = 5
	maxDocumentDigits = 15
	minDateYear       = 1900
	dateLayout        = "2/1/2006"
	// StoredDateLayout is how accepted dates are persisted, so they sort and
	// parse unambiguously regardless of how the customer typed them.
	StoredDateLayout = "2006-01-02"
)

// Parse collapses whitespace and drops control characters before counting, so
// pasted line breaks or invisible characters cannot pad an answer past the
// limit nor break how it renders in the agenda.
func (r TextRule) Parse(answer string) (string, error) {
	cleaned := strings.Join(strings.Fields(strings.Map(dropControl, answer)), " ")
	length := utf8.RuneCountInString(cleaned)
	if length == 0 || length < r.MinLength {
		return "", invalidAnswer("text answer too short",
			fmt.Sprintf("La respuesta debe tener al menos %d caracteres.", max(r.MinLength, 1)))
	}
	if length > r.MaxLength {
		return "", invalidAnswer("text answer too long",
			fmt.Sprintf("La respuesta debe tener máximo %d caracteres (enviaste %d).", r.MaxLength, length))
	}
	return cleaned, nil
}

func (r TextRule) Hint() string {
	return fmt.Sprintf("Máximo %d caracteres.", r.MaxLength)
}

// Parse accepts a bare address only; a display name ("Ana <ana@x.co>") is
// rejected because the stored value is used as a contact address.
func (EmailRule) Parse(answer string) (string, error) {
	invalid := invalidAnswer("malformed email", "Escribe un correo válido, por ejemplo nombre@correo.com.")
	if len(answer) > maxEmailLength || strings.ContainsAny(answer, " <>") {
		return "", invalid
	}
	address, err := mail.ParseAddress(answer)
	if err != nil || address.Name != "" || address.Address != answer {
		return "", invalid
	}
	local, domain, found := strings.Cut(address.Address, "@")
	if !found || local == "" || !strings.Contains(domain, ".") || strings.HasSuffix(domain, ".") {
		return "", invalid
	}
	return strings.ToLower(address.Address), nil
}

func (EmailRule) Hint() string { return "Ejemplo: nombre@correo.com" }

func (DocumentRule) Parse(answer string) (string, error) {
	digits := strings.Map(func(r rune) rune {
		if r == '.' || r == '-' || unicode.IsSpace(r) {
			return -1
		}
		return r
	}, answer)

	if len(digits) < minDocumentDigits || len(digits) > maxDocumentDigits || !isDigits(digits) {
		return "", invalidAnswer("malformed document number",
			fmt.Sprintf("Escribe solo los números del documento, entre %d y %d dígitos.", minDocumentDigits, maxDocumentDigits))
	}
	return digits, nil
}

func (DocumentRule) Hint() string { return "Solo números, sin puntos ni espacios." }

func (r NumberRule) Parse(answer string) (string, error) {
	value, err := strconv.ParseInt(answer, 10, 64)
	if err != nil {
		return "", invalidAnswer("answer is not an integer", "Escribe solo un número entero, sin letras ni símbolos.")
	}
	if (r.Min != nil && value < int64(*r.Min)) || (r.Max != nil && value > int64(*r.Max)) {
		return "", invalidAnswer("number out of range", "El número debe estar "+r.rangeText()+".")
	}
	return strconv.FormatInt(value, 10), nil
}

func (r NumberRule) Hint() string {
	if r.Min == nil && r.Max == nil {
		return "Solo números."
	}
	return "Un número " + r.rangeText() + "."
}

func (r NumberRule) rangeText() string {
	switch {
	case r.Min != nil && r.Max != nil:
		return fmt.Sprintf("entre %d y %d", *r.Min, *r.Max)
	case r.Min != nil:
		return fmt.Sprintf("mayor o igual a %d", *r.Min)
	case r.Max != nil:
		return fmt.Sprintf("menor o igual a %d", *r.Max)
	default:
		return "válido"
	}
}

// Parse accepts "/", "-" or "." as separators and one- or two-digit day and
// month. time.Parse rejects impossible dates such as 31/02. Date fields record
// past facts (birth dates, last visits), so future dates are rejected; "today"
// is taken in UTC, which at worst accepts tomorrow for a few evening hours in
// the Americas.
func (DateRule) Parse(answer string) (string, error) {
	date, err := parseDate(answer)
	if err != nil {
		return "", invalidAnswer("malformed date", "Escribe la fecha como DD/MM/AAAA, por ejemplo 25/12/1990.")
	}
	if date.Year() < minDateYear {
		return "", invalidAnswer("date before minimum year",
			fmt.Sprintf("La fecha no puede ser anterior a %d.", minDateYear))
	}
	if date.After(time.Now().UTC()) {
		return "", invalidAnswer("date in the future", "La fecha no puede ser futura.")
	}
	return date.Format(StoredDateLayout), nil
}

// parseDate also accepts StoredDateLayout, so a saved answer validates again
// when a one-time field is reused. Year-first input is unambiguous, so
// accepting it from customers costs nothing.
func parseDate(answer string) (time.Time, error) {
	if date, err := time.Parse(StoredDateLayout, answer); err == nil {
		return date, nil
	}
	normalized := strings.NewReplacer("-", "/", ".", "/").Replace(answer)
	return time.Parse(dateLayout, normalized)
}

func (DateRule) Hint() string { return "Formato DD/MM/AAAA, sin fechas futuras." }

func (PhoneRule) Parse(answer string) (string, error) {
	normalized, err := phone.Parse(answer)
	if err != nil {
		return "", invalidAnswer("invalid phone number", "Escribe un celular colombiano de 10 dígitos, por ejemplo 300 123 4567.")
	}
	return normalized, nil
}

func (PhoneRule) Hint() string { return "Celular de 10 dígitos." }

func dropControl(r rune) rune {
	if unicode.IsControl(r) && !unicode.IsSpace(r) {
		return -1
	}
	// Format characters (zero-width spaces, bidi overrides) are invisible and
	// only serve to spoof or pad text.
	if unicode.Is(unicode.Cf, r) {
		return -1
	}
	return r
}

func isDigits(s string) bool {
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}
