package appointments_update_status

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"
	"wappiz/pkg/whatsapp"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"wappiz/pkg/server"
)

var validTransitions = map[string][]string{
	"pending":     {"confirmed", "cancelled"},
	"confirmed":   {"check_in", "cancelled", "no_show"},
	"check_in":    {"in_progress", "cancelled"},
	"in_progress": {"completed", "cancelled"},
	"completed":   {},
	"cancelled":   {},
	"no_show":     {},
}

type Request struct {
	Status string `json:"status"`
	Reason string `json:"reason"`
}

type Handler struct {
	DB       db.Database
	Whatsapp whatsapp.Client
}

func (h *Handler) Method() string { return http.MethodPut }
func (h *Handler) Path() string   { return "/v1/appointments/:id/status" }

func (h *Handler) Handle(c *gin.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid appointment id"),
			fault.Public("Id de cita inválido"),
		)

	}
	req, err := server.BindBody[Request](c)
	if err != nil {
		return err
	}
	if req.Status == "" {
		return fault.New("missing status field",
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("status field is required"),
			fault.Public("El campo 'status' es requerido"),
		)
	}

	tenantID := jwt.TenantIDFromContext(c)
	updatedBy := jwt.UserIDFromContext(c)
	updatedByRole, _ := c.Get("role")
	role, _ := updatedByRole.(string)

	appt, err := db.Query.FindAppointmentByID(c.Request.Context(), h.DB.Primary(), db.FindAppointmentByIDParams{
		ID:       id,
		TenantID: tenantID,
	})
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("appointment not found"),
			fault.Public("La cita no existe"),
		)

	}

	allowed := validTransitions[string(appt.Status)]
	validTransition := false
	for _, s := range allowed {
		if s == req.Status {
			validTransition = true
			break
		}
	}
	if !validTransition {
		return fault.New("invalid status transition",
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal(fmt.Sprintf("invalid transition from %s to %s", appt.Status, req.Status)),
			fault.Public("La transición de estado no es válida"),
		)

	}

	err = db.Tx(c.Request.Context(), h.DB.Primary(), func(ctx context.Context, tx db.DBTX) error {
		updateParams := db.UpdateAppointmentParams{
			Status:       db.AppointmentStatus(req.Status),
			CancelledBy:  sql.NullString{},
			CancelReason: sql.NullString{},
			CompletedAt:  sql.NullTime{},
			ID:           id,
		}

		if req.Status == "cancelled" {
			updateParams.CancelledBy = sql.NullString{String: updatedBy, Valid: updatedBy != ""}
			updateParams.CancelReason = sql.NullString{String: req.Reason, Valid: req.Reason != ""}
		}

		if err := db.Query.UpdateAppointment(c.Request.Context(), tx, updateParams); err != nil {
			return fault.Wrap(err, fault.Internal("failed to update appointment status"))
		}

		if err := db.Query.InsertAppointmentStatusHistory(c.Request.Context(), tx, db.InsertAppointmentStatusHistoryParams{
			ID:            uuid.New(),
			AppointmentID: id,
			FromStatus:    appt.Status,
			ToStatus:      db.AppointmentStatus(req.Status),
			ChangedBy:     sql.NullString{String: updatedBy, Valid: updatedBy != ""},
			ChangedByRole: sql.NullString{String: role, Valid: role != ""},
			Reason:        sql.NullString{String: req.Reason, Valid: req.Reason != ""},
		}); err != nil {
			return fault.Wrap(err, fault.Internal("failed to insert appointment status history"))
		}

		return nil
	})

	if err != nil {
		return err

	}

	if req.Status == "cancelled" && role != "customer" {
		go h.sendCancellationNotification(appt)
	}

	c.Status(http.StatusNoContent)
	return nil
}

func (h *Handler) sendCancellationNotification(appt db.FindAppointmentByIDRow) {
	ctx := context.Background()

	customer, err := db.Query.FindCustomerByID(ctx, h.DB.Primary(), appt.CustomerID)
	if err != nil {
		log.Printf("[appointments] sendCancellationNotification: failed to find customer %s: %v", appt.CustomerID, err)
		return
	}

	tenant, err := db.Query.FindTenantByID(ctx, h.DB.Primary(), appt.TenantID)
	if err != nil {
		log.Printf("[appointments] sendCancellationNotification: failed to find tenant %s: %v", appt.TenantID, err)
		return
	}

	waConfig, err := db.Query.FindTenantWhatsappConfig(ctx, h.DB.Primary(), appt.TenantID)
	if err != nil {
		log.Printf("[appointments] sendCancellationNotification: failed to find whatsapp config for tenant %s: %v", appt.TenantID, err)
		return
	}

	body := fmt.Sprintf("Tu cita del *%s* ha sido cancelada.\n\n%s",
		appt.StartsAt.Format("02/01/2006 03:04 PM"),
		extractCancellationMsg(tenant.Settings),
	)

	if err := h.Whatsapp.SendText(ctx, customer.PhoneNumber, waConfig.PhoneNumberID.String, waConfig.AccessToken.String, body); err != nil {
		log.Printf("[appointments] sendCancellationNotification: failed to send whatsapp to %s: %v", customer.PhoneNumber, err)
	}
}

func extractCancellationMsg(settings []byte) string {
	var s struct {
		CancellationMsg string `json:"cancellationMsg"`
	}
	if err := json.Unmarshal(settings, &s); err == nil && s.CancellationMsg != "" {
		return s.CancellationMsg
	}
	return "Escríbenos cuando quieras agendar una nueva cita 👋"
}
