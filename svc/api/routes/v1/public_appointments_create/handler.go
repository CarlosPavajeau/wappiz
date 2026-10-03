package public_appointments_create

import (
	"database/sql"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"
	"wappiz/internal/events"
	"wappiz/internal/services/booking"
	"wappiz/internal/services/turnstile"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/server"
	"wappiz/svc/api/internal/publicbooking"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	minCustomerNameLength = 2
	maxCustomerNameLength = 100
)

type Request struct {
	ServiceID      uuid.UUID `json:"serviceId"      binding:"required"`
	ResourceID     uuid.UUID `json:"resourceId"     binding:"required"`
	StartsAt       time.Time `json:"startsAt"       binding:"required"`
	CustomerName   string    `json:"customerName"   binding:"required"`
	PhoneNumber    string    `json:"phoneNumber"    binding:"required"`
	TurnstileToken string    `json:"turnstileToken" binding:"required"`
}

type Response struct {
	ID           uuid.UUID `json:"id"`
	StartsAt     time.Time `json:"startsAt"`
	EndsAt       time.Time `json:"endsAt"`
	ServiceName  string    `json:"serviceName"`
	ResourceName string    `json:"resourceName"`
}

type Handler struct {
	DB        db.Database
	Booking   *booking.Service
	Turnstile turnstile.Verifier
}

func (h *Handler) Method() string { return http.MethodPost }
func (h *Handler) Path() string   { return "/v1/public/tenants/:slug/appointments" }

// Handle books an appointment for an anonymous customer identified only by
// their WhatsApp number. The confirmation is delivered asynchronously over
// WhatsApp by the appointment.created handler.
func (h *Handler) Handle(c *gin.Context) error {
	req, err := server.BindBody[Request](c)
	if err != nil {
		return err
	}
	ctx := c.Request.Context()

	// Verify the captcha before touching the database so bots are turned
	// away as cheaply as possible.
	human, err := h.Turnstile.Verify(ctx, req.TurnstileToken, c.ClientIP())
	if err != nil {
		return fault.Wrap(err, fault.Internal("verify turnstile token"))
	}
	if !human {
		return fault.New("captcha rejected",
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("turnstile token is invalid or already used"),
			fault.Public("No pudimos verificar que no eres un robot. Intenta de nuevo."),
		)
	}

	customerName, err := parseCustomerName(req.CustomerName)
	if err != nil {
		return err
	}
	phoneNumber, err := publicbooking.ParsePhoneNumber(req.PhoneNumber)
	if err != nil {
		return err
	}

	tenant, err := publicbooking.FindTenant(ctx, h.DB, c.Param("slug"))
	if err != nil {
		return err
	}

	if req.StartsAt.After(time.Now().AddDate(0, 0, publicbooking.BookingWindowDays+1)) {
		return fault.New("date beyond booking window",
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("startsAt is beyond the public booking window"),
			fault.Public("La fecha está fuera del rango permitido para reservar"),
		)
	}

	customer, err := booking.FindOrCreateCustomer(ctx, h.DB.Primary(), tenant.ID, phoneNumber)
	if err != nil {
		return err
	}
	// Only fill in a missing name: the number is not verified, so a
	// stranger must not be able to rename an existing customer.
	if !customer.Name.Valid || strings.TrimSpace(customer.Name.String) == "" {
		if err := db.Query.UpdateCustomer(ctx, h.DB.Primary(), db.UpdateCustomerParams{
			Name: sql.NullString{String: customerName, Valid: true},
			ID:   customer.ID,
		}); err != nil {
			return fault.Wrap(err, fault.Internal("set customer name"))
		}
	}

	appointment, err := h.Booking.Create(ctx, booking.CreateParams{
		TenantID:   tenant.ID,
		CustomerID: customer.ID,
		ResourceID: req.ResourceID,
		ServiceID:  req.ServiceID,
		StartsAt:   req.StartsAt,
		Source:     events.AppointmentCreatedSourcePublic,
	})
	if err != nil {
		return err
	}

	c.JSON(http.StatusCreated, Response{
		ID:           appointment.ID,
		StartsAt:     appointment.StartsAt,
		EndsAt:       appointment.EndsAt,
		ServiceName:  appointment.ServiceName,
		ResourceName: appointment.ResourceName,
	})
	return nil
}

func parseCustomerName(raw string) (string, error) {
	name := strings.Join(strings.Fields(raw), " ")
	n := utf8.RuneCountInString(name)
	if n < minCustomerNameLength || n > maxCustomerNameLength {
		return "", fault.New("invalid customer name",
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("customer name length out of range"),
			fault.Public("Ingresa tu nombre (entre 2 y 100 caracteres)"),
		)
	}
	return name, nil
}
