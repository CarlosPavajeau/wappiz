package tenants_get_by_user

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
func (h *Handler) Path() string   { return "/v1/tenants/by-user" }

func (h *Handler) Handle(c *gin.Context) error {
	userID := jwt.UserIDFromContext(c)

	tenant, err := db.Query.FindTenantByUserId(c.Request.Context(), h.DB.Primary(), userID)
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("tenant not found for user"),
			fault.Public("No se encontró una cuenta asociada a este usuario"),
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
