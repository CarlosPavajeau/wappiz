package admin_activate_tenant

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"html"
	"net/http"
	"strings"
	"time"
	"wappiz/pkg/codes"
	"wappiz/pkg/crypto"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/logger"
	"wappiz/pkg/mailer"

	"wappiz/pkg/server"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	activationEmailSendTimeout = 30 * time.Second
	activationEmailSubject     = "¡Tu barbería ya puede recibir citas!"
)

type Request struct {
	PhoneNumberID      string `json:"phoneNumberId"      binding:"required"`
	DisplayPhoneNumber string `json:"displayPhoneNumber" binding:"required"`
	WABAID             string `json:"wabaId"             binding:"required"`
	AccessToken        string `json:"accessToken"        binding:"required"`
}

type Handler struct {
	DB     db.Database
	Mailer mailer.Mailer
	Crypto *crypto.Service
}

func (h *Handler) Method() string {
	return http.MethodPost
}

func (h *Handler) Path() string {
	return "/v1/admin/activations/:id/activate"
}

func (h *Handler) Handle(c *gin.Context) error {
	tenantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid tenant id"), fault.Public("Id del tenant inválido"),
		)

	}
	req, err := server.BindBody[Request](c)
	if err != nil {
		return err
	}

	ctx := c.Request.Context()

	type Result struct {
		TenantName             string
		ActivationContactEmail string
	}

	result, err := db.TxWithResult(ctx, h.DB.Primary(), func(ctx context.Context, txx db.DBTX) (*Result, error) {
		tenant, err := db.Query.FindTenantByID(ctx, txx, tenantID)
		if err != nil {
			return nil, err
		}

		accessToken, err := h.Crypto.Encrypt(req.AccessToken)
		if err != nil {
			return nil, err
		}

		if err := db.Query.ActivateTenantWhatsappConfig(ctx, txx, db.ActivateTenantWhatsappConfigParams{
			WabaID:             sql.NullString{String: req.WABAID, Valid: req.WABAID != ""},
			PhoneNumberID:      sql.NullString{String: req.PhoneNumberID, Valid: req.PhoneNumberID != ""},
			DisplayPhoneNumber: sql.NullString{String: req.DisplayPhoneNumber, Valid: req.DisplayPhoneNumber != ""},
			AccessToken:        sql.NullString{String: accessToken, Valid: accessToken != ""},
			TenantID:           tenantID,
		}); err != nil {
			return nil, err
		}

		waConfig, err := db.Query.FindTenantWhatsappConfig(ctx, txx, tenantID)
		if err != nil {
			return nil, err
		}

		if !waConfig.ActivationContactEmail.Valid {
			return nil, nil
		}

		return &Result{
			TenantName:             tenant.Name,
			ActivationContactEmail: waConfig.ActivationContactEmail.String,
		}, nil
	})

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fault.Wrap(err,
				fault.Code(codes.ErrorsNotFound),
				fault.Internal("Tenant not found"), fault.Public("Tenant no encontrado"),
			)

		}
		return fault.Wrap(err, fault.Internal("failed to activate tenant"))

	}

	if result != nil {
		scheduleActivationEmail(h.Mailer, tenantID, result.ActivationContactEmail, result.TenantName, req.DisplayPhoneNumber)
	}

	c.JSON(http.StatusOK, gin.H{"message": "tenant activated"})
	return nil
}

// scheduleActivationEmail sends the tenant activation notification asynchronously
// (non-blocking for the HTTP handler). Errors are logged only.
func scheduleActivationEmail(m mailer.Mailer, tenantID uuid.UUID, to, tenantName, displayPhoneNumber string) {
	body := buildActivationEmail(tenantName, displayPhoneNumber)

	go func(tenantID uuid.UUID, to, body string) {
		mailCtx, cancel := context.WithTimeout(context.Background(), activationEmailSendTimeout)
		defer cancel()

		if err := m.Send(mailCtx, mailer.Email{
			To:      to,
			Subject: activationEmailSubject,
			Body:    body,
		}); err != nil {
			logger.Warn("[admin] activation notification email",
				"tenant_id", tenantID,
				"err", err)
		}
	}(tenantID, to, body)
}

func buildActivationEmail(tenantName, phoneNumber string) string {
	waLink := "https://wa.me/" + sanitizePhone(phoneNumber)
	safeName := html.EscapeString(tenantName)
	safePhone := html.EscapeString(phoneNumber)
	safeLink := html.EscapeString(waLink)
	return fmt.Sprintf(`
		<h2>🎉 ¡Tu barbería ya puede recibir citas!</h2>
		<p>Hola <strong>%s</strong>,</p>
		<p>Tu número de WhatsApp ya está listo.</p>
		<h3>📱 Número de tu barbería:<br>%s</h3>
		<p>Dale este número a tus clientes o comparte el enlace directo:</p>
		<p><a href="%s">%s</a></p>
	`, safeName, safePhone, safeLink, safeLink)
}

func sanitizePhone(phone string) string {
	var result strings.Builder

	for _, ch := range phone {
		if ch >= '0' && ch <= '9' {
			result.WriteString(string(ch))
		}
	}

	return result.String()
}
