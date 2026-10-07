package resources_create

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
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

type fixture struct {
	database db.Database
	router   *gin.Engine
	tenantID uuid.UUID
}

func newFixture(t *testing.T, flags featureflags.Service) fixture {
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
			Flags:       flags,
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
		f := newFixture(t, featureflags.Static())

		require.Equal(t, http.StatusCreated, f.createResource(t))
		require.Equal(t, http.StatusCreated, f.createResource(t))
	})

	t.Run("billing flag on applies free plan limit without subscription", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t, featureflags.Static(featureflags.Billing))

		require.Equal(t, http.StatusCreated, f.createResource(t))
		require.Equal(t, http.StatusForbidden, f.createResource(t))
	})

	t.Run("billing flag on applies the active plan limit", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t, featureflags.Static(featureflags.Billing))
		f.subscribe(t, `{"maxResources": 2}`)

		require.Equal(t, http.StatusCreated, f.createResource(t))
		require.Equal(t, http.StatusCreated, f.createResource(t))
		require.Equal(t, http.StatusForbidden, f.createResource(t))
	})

	t.Run("billing flag on with unlimited plan", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t, featureflags.Static(featureflags.Billing))
		f.subscribe(t, `{}`)

		require.Equal(t, http.StatusCreated, f.createResource(t))
		require.Equal(t, http.StatusCreated, f.createResource(t))
	})

	t.Run("billing flag on frees quota when a resource is deleted", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t, featureflags.Static(featureflags.Billing))

		require.Equal(t, http.StatusCreated, f.createResource(t))
		_, err := f.database.Primary().ExecContext(context.Background(),
			`UPDATE resources SET is_active = false WHERE tenant_id = $1`, f.tenantID)
		require.NoError(t, err)

		require.Equal(t, http.StatusCreated, f.createResource(t))
		require.Equal(t, http.StatusForbidden, f.createResource(t))
	})

	t.Run("billing flag on serialises concurrent creations", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t, featureflags.Static(featureflags.Billing))
		ctx := context.Background()
		svc := plans.New(plans.Config{
			DB:          f.database,
			Flags:       featureflags.Static(featureflags.Billing),
			Environment: testEnvironment,
		})

		// Hold the quota check of an in-flight creation open, then race a
		// request against it: it must wait for the commit and see the new
		// resource instead of the stale count.
		tx, err := f.database.Primary().Begin(ctx)
		require.NoError(t, err)
		require.NoError(t, svc.EnsureCanCreateResource(ctx, tx, f.tenantID))
		require.NoError(t, db.Query.InsertResource(ctx, tx, db.InsertResourceParams{
			ID:       uuid.New(),
			TenantID: f.tenantID,
			Name:     "Carlos",
			Type:     "barber",
		}))

		status := make(chan int, 1)
		go func() { status <- f.createResource(t) }()

		select {
		case got := <-status:
			require.NoError(t, tx.Rollback())
			t.Fatalf("request finished with %d while the quota lock was held", got)
		case <-time.After(300 * time.Millisecond):
		}

		require.NoError(t, tx.Commit())
		require.Equal(t, http.StatusForbidden, <-status)
	})
}
