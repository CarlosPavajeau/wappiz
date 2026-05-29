package onboarding_get_progress

import (
	"net/http"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodGet }
func (h *Handler) Path() string   { return "/v1/onboarding/progress" }

const stepAccount = 1

func (h *Handler) Handle(c *gin.Context) error {
	tenantID, ok := jwt.TenantIDFromContextOK(c)
	if !ok {
		c.JSON(http.StatusOK, gin.H{
			"currentStep": stepAccount,
			"isCompleted": false,
		})
		return nil
	}

	progress, err := db.Query.FindOnboardingProgressByTenant(c.Request.Context(), h.DB.Primary(), tenantID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to fetch onboarding progress"))

	}

	c.JSON(http.StatusOK, gin.H{
		"currentStep": progress.CurrentStep,
		"isCompleted": progress.CompletedAt.Valid,
	})
	return nil
}
