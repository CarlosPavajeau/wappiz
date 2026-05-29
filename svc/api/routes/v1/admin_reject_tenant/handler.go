package admin_reject_tenant

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"html"
	"net/http"
	"time"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/logger"
	"wappiz/pkg/mailer"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"wappiz/pkg/server"
)

const (
	emailSendTimeout = 30 * time.Second
	emailSubject     = "Hemos rechazado tu solicitud"
)

type Request struct {
	Reason string `json:"reason" binding:"required"`
}

type Handler struct {
	DB     db.Database
	Mailer mailer.Mailer
}

func (h *Handler) Method() string {
	return http.MethodPost
}

func (h *Handler) Path() string {
	return "/v1/admin/activations/:id/reject"
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
		tenant, err := db.Query.FindTenantByID(ctx, h.DB.Primary(), tenantID)
		if err != nil {
			return nil, err
		}

		if err := db.Query.RejectTenantActivation(ctx, h.DB.Primary(), db.RejectTenantActivationParams{
			RejectReason: sql.NullString{String: req.Reason, Valid: req.Reason != ""},
			TenantID:     tenant.ID,
		}); err != nil {
			return nil, err
		}

		waConfig, err := db.Query.FindTenantWhatsappConfig(ctx, h.DB.Primary(), tenantID)
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
		return fault.Wrap(err,
			fault.Internal("failed to reject tenant"))

	}

	if result != nil {
		scheduleRejectionEmail(h.Mailer, result.ActivationContactEmail, result.TenantName, req.Reason)
	}

	c.JSON(http.StatusOK, gin.H{"message": "tenant rejected successfully"})
	return nil
}

func scheduleRejectionEmail(m mailer.Mailer, to, tenantName, reason string) {
	body := buildRejectEmail(tenantName, reason)

	go func(to, body string) {
		mailCtx, cancel := context.WithTimeout(context.Background(), emailSendTimeout)
		defer cancel()

		if err := m.Send(mailCtx, mailer.Email{
			To:      to,
			Subject: emailSubject,
			Body:    body,
		}); err != nil {
			logger.Warn("[admin] rejection notification email",
				"err", err)
		}
	}(to, body)
}

func buildRejectEmail(tenantName, reason string) string {
	safeName := html.EscapeString(tenantName)
	safeReason := html.EscapeString(reason)

	return fmt.Sprintf(`
		<h2>Hemo rechazado tu solicitud</h2>
		<p>Hola <strong>%s</strong>,</p>
		<p>Desafortunadamente hemos rechazado tu solicitud.</p>
		<h3>Razón:<br>%s</h3>
	`, safeName, safeReason)
}
