package tenants_update

import (
	"encoding/json"
	"net/http"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/svc/api/internal/middleware"
	"wappiz/svc/api/internal/publicbooking"

	"github.com/gin-gonic/gin"
	"wappiz/pkg/server"
)

// Request is a partial update: omitted fields keep their stored value. The
// settings JSON also holds values this endpoint does not manage (e.g.
// ownerPhone), so it must be merged, never replaced wholesale.
type Request struct {
	WelcomeMessage           *string `json:"welcomeMessage"`
	BotName                  *string `json:"botName"`
	CancellationMsg          *string `json:"cancellationMessage"`
	ContactEmail             *string `json:"contactEmail"`
	LateCancelHours          *int    `json:"lateCancelHours"`
	AutoBlockAfterNoShows    *int    `json:"autoBlockAfterNoShows"`
	AutoBlockAfterLateCancel *int    `json:"autoBlockAfterLateCancel"`
	SendWarningBeforeBlock   *bool   `json:"sendWarningBeforeBlock"`
	PublicBookingEnabled     *bool   `json:"publicBookingEnabled"`
}

// applyTo returns settings with every field present in the request
// overwritten.
func (r Request) applyTo(settings db.TenantSettings) db.TenantSettings {
	set(&settings.WelcomeMessage, r.WelcomeMessage)
	set(&settings.BotName, r.BotName)
	set(&settings.CancellationMsg, r.CancellationMsg)
	set(&settings.ContactEmail, r.ContactEmail)
	set(&settings.LateCancelHours, r.LateCancelHours)
	set(&settings.AutoBlockAfterNoShows, r.AutoBlockAfterNoShows)
	set(&settings.AutoBlockAfterLateCancel, r.AutoBlockAfterLateCancel)
	set(&settings.SendWarningBeforeBlock, r.SendWarningBeforeBlock)
	set(&settings.PublicBookingEnabled, r.PublicBookingEnabled)
	return settings
}

// enablesPublicBooking reports whether the request turns the public booking
// page on. Saving other settings while it is already on is not re-checked.
func (r Request) enablesPublicBooking(current db.TenantSettings) bool {
	return r.PublicBookingEnabled != nil && *r.PublicBookingEnabled && !current.PublicBookingEnabled
}

func set[T any](dst *T, value *T) {
	if value != nil {
		*dst = *value
	}
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodPut }
func (h *Handler) Path() string   { return "/v1/tenants/settings" }

func (h *Handler) Handle(c *gin.Context) error {
	req, err := server.BindBody[Request](c)
	if err != nil {
		return err
	}

	tenantID := middleware.TenantIDFromContext(c)

	tenant, err := db.Query.FindTenantByID(c.Request.Context(), h.DB.Primary(), tenantID)
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("tenant not found"),
			fault.Public("La cuenta no fue encontrada"),
		)

	}

	current, err := db.UnmarshalNullableJSONTo[db.TenantSettings](tenant.Settings)
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to parse tenant settings"))
	}

	// Public bookings are confirmed only over WhatsApp, so the page cannot be
	// turned on until the tenant can actually send that confirmation.
	if req.enablesPublicBooking(current) {
		canSend, err := publicbooking.CanSendWhatsapp(c.Request.Context(), h.DB, tenantID)
		if err != nil {
			return err
		}
		if !canSend {
			return fault.New("whatsapp not ready for public booking",
				fault.Code(codes.ErrorsBadRequest),
				fault.Internal("public booking requires an active whatsapp configuration"),
				fault.Public("Conecta y activa tu WhatsApp antes de activar la página de reservas"),
			)
		}
	}

	newSettings, err := json.Marshal(req.applyTo(current))
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to serialize settings"))

	}

	if err := db.Query.UpdateTenant(c.Request.Context(), h.DB.Primary(), db.UpdateTenantParams{
		Name:     tenant.Name,
		Timezone: tenant.Timezone,
		Settings: newSettings,
		ID:       tenantID,
	}); err != nil {
		return fault.Wrap(err, fault.Internal("failed to update tenant settings"))

	}

	c.JSON(http.StatusOK, gin.H{"message": "settings updated"})
	return nil
}
