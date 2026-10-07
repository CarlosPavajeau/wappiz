package onboarding_step_resource

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"wappiz/internal/services/featureflags"
	"wappiz/internal/services/plans"
	"wappiz/pkg/server"
	"wappiz/svc/api/internal/middleware"
	"wappiz/svc/api/internal/testutil"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

type fakeFlags struct{ billing bool }

func (f fakeFlags) IsEnabled(_ context.Context, flag featureflags.Flag, _ uuid.UUID) bool {
	return flag == featureflags.Billing && f.billing
}
func (fakeFlags) Close() error { return nil }

// submitStep posts the resource step for a tenant that already owns one
// resource and has moved past the step, i.e. a resubmission.
func submitStep(t *testing.T, billing bool) int {
	t.Helper()
	gin.SetMode(gin.TestMode)
	ctx := context.Background()

	database := testutil.NewHarness(t).DB
	tenantID := uuid.New()
	_, err := database.Primary().ExecContext(ctx,
		`INSERT INTO tenants (id, name, slug, month_reset_at) VALUES ($1, 'Barber Kings', $2, now())`,
		tenantID, "barber-"+tenantID.String())
	require.NoError(t, err)
	_, err = database.Primary().ExecContext(ctx,
		`INSERT INTO onboarding_progress (tenant_id, current_step) VALUES ($1, 4)`, tenantID)
	require.NoError(t, err)
	_, err = database.Primary().ExecContext(ctx,
		`INSERT INTO resources (tenant_id, name) VALUES ($1, 'Carlos')`, tenantID)
	require.NoError(t, err)

	h := &Handler{
		DB: database,
		Plans: plans.New(plans.Config{
			DB:          database,
			Flags:       fakeFlags{billing: billing},
			Environment: "sandbox",
		}),
	}

	r := gin.New()
	r.Use(middleware.WithErrorHandling())
	r.Use(func(c *gin.Context) {
		c.Set("tenant_id", tenantID)
		c.Next()
	})
	r.POST(h.Path(), server.ToGinHandler(h))

	body := `{"name":"Andrés","type":"barber","workingDays":[1,2,3],"startTime":"09:00","endTime":"18:00"}`
	req := httptest.NewRequest(http.MethodPost, h.Path(), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	return w.Code
}

func TestHandle_ResourceQuota(t *testing.T) {
	t.Parallel()

	t.Run("billing flag off ignores plan limits", func(t *testing.T) {
		t.Parallel()
		require.Equal(t, http.StatusOK, submitStep(t, false))
	})

	t.Run("billing flag on enforces free plan limit", func(t *testing.T) {
		t.Parallel()
		require.Equal(t, http.StatusForbidden, submitStep(t, true))
	})
}
