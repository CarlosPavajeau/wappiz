package tenants_get_current

import (
	"encoding/json"
	"net/http"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Response struct {
	ID       uuid.UUID         `json:"id"`
	Name     string            `json:"name"`
	Slug     string            `json:"slug"`
	TimeZone string            `json:"time_zone"`
	Currency string            `json:"currency"`
	Settings db.TenantSettings `json:"settings"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodGet }
func (h *Handler) Path() string   { return "/v1/tenants/me" }

func (h *Handler) Handle(c *gin.Context) error {
	tenantID := jwt.TenantIDFromContext(c)

	tenant, err := db.Query.FindTenantByID(c.Request.Context(), h.DB.Primary(), tenantID)
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("tenant not found"),
			fault.Public("La cuenta no fue encontrada"),
		)

	}

	var settings db.TenantSettings
	if err := json.Unmarshal(tenant.Settings, &settings); err != nil {
		return fault.Wrap(err, fault.Internal("failed to parse tenant settings"))

	}

	c.JSON(http.StatusOK, Response{
		ID:       tenant.ID,
		Name:     tenant.Name,
		Slug:     tenant.Slug,
		TimeZone: tenant.Timezone,
		Currency: tenant.Currency,
		Settings: settings,
	})
	return nil
}
