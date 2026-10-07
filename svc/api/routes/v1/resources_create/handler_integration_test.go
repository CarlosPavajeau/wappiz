package resources_create

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"wappiz/internal/services/featureflags"
	"wappiz/internal/services/plans"
	"wappiz/pkg/db"
	"wappiz/pkg/server"
	"wappiz/svc/api/internal/middleware"
	"wappiz/svc/api/internal/testutil"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

const testEnvironment = "sandbox"

type fakeFlags struct{ billing bool }

func (f fakeFlags) IsEnabled(_ context.Context, flag featureflags.Flag, _ uuid.UUID) bool {
	return flag == featureflags.Billing && f.billing
}
func (fakeFlags) Close() error { return nil }

type fixture struct {
	database db.Database
	router   *gin.Engine
	tenantID uuid.UUID
}

func newFixture(t *testing.T, billing bool) fixture {
	t.Helper()
	gin.SetMode(gin.TestMode)

	database := testutil.NewHarness(t).DB
	tenantID := uuid.New()
	_, err := database.Primary().ExecContext(context.Background(),
		`INSERT INTO tenants (id, name, slug, month_reset_at) VALUES ($1, 'Barber Kings', $2, now())`,
		tenantID, "barber-"+tenantID.String())
	require.NoError(t, err)

	h := &Handler{
		DB: database,
		Plans: plans.New(plans.Config{
			DB:          database,
			Flags:       fakeFlags{billing: billing},
			Environment: testEnvironment,
		}),
	}

	r := gin.New()
	r.Use(middleware.WithErrorHandling())
	r.Use(func(c *gin.Context) {
		c.Set("tenant_id", tenantID)
		c.Next()
	})
	r.POST(h.Path(), server.ToGinHandler(h))

	return fixture{database: database, router: r, tenantID: tenantID}
}

func (f fixture) subscribe(t *testing.T, features string) {
	t.Helper()
	ctx := context.Background()

	planID := uuid.New()
	_, err := f.database.Primary().ExecContext(ctx,
		`INSERT INTO plans (id, external_id, name, features, environment) VALUES ($1, $2, 'Pro', $3, $4)`,
		planID, "prod-"+planID.String(), features, testEnvironment)
	require.NoError(t, err)

	_, err = f.database.Primary().ExecContext(ctx,
		`INSERT INTO subscriptions (tenant_id, plan_id, external_id, external_customer_id, status, environment)
		 VALUES ($1, $2, $3, 'cus-1', 'active', $4)`,
		f.tenantID, planID, "sub-"+planID.String(), testEnvironment)
	require.NoError(t, err)
}

func (f fixture) createResource(t *testing.T) int {
	t.Helper()

	req := httptest.NewRequest(http.MethodPost, "/v1/resources", strings.NewReader(`{"name":"Carlos","type":"barber"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	f.router.ServeHTTP(w, req)

	return w.Code
}

func TestHandle_ResourceLimits(t *testing.T) {
	t.Parallel()

	t.Run("billing flag off ignores plan limits", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t, false)

		require.Equal(t, http.StatusCreated, f.createResource(t))
		require.Equal(t, http.StatusCreated, f.createResource(t))
	})

	t.Run("billing flag on applies free plan limit without subscription", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t, true)

		require.Equal(t, http.StatusCreated, f.createResource(t))
		require.Equal(t, http.StatusForbidden, f.createResource(t))
	})

	t.Run("billing flag on applies the active plan limit", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t, true)
		f.subscribe(t, `{"maxResources": 2}`)

		require.Equal(t, http.StatusCreated, f.createResource(t))
		require.Equal(t, http.StatusCreated, f.createResource(t))
		require.Equal(t, http.StatusForbidden, f.createResource(t))
	})

	t.Run("billing flag on with unlimited plan", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t, true)
		f.subscribe(t, `{}`)

		require.Equal(t, http.StatusCreated, f.createResource(t))
		require.Equal(t, http.StatusCreated, f.createResource(t))
	})
}
