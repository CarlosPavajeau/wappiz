package resources_update

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
			Environment: "sandbox",
		}),
	}

	r := gin.New()
	r.Use(middleware.WithErrorHandling())
	r.Use(func(c *gin.Context) {
		c.Set("tenant_id", tenantID)
		c.Next()
	})
	r.PUT(h.Path(), server.ToGinHandler(h))

	return fixture{database: database, router: r, tenantID: tenantID}
}

func (f fixture) insertResource(t *testing.T, isActive bool) uuid.UUID {
	t.Helper()

	id := uuid.New()
	_, err := f.database.Primary().ExecContext(context.Background(),
		`INSERT INTO resources (id, tenant_id, name, type, is_active, sort_order) VALUES ($1, $2, 'Carlos', 'barber', $3, 7)`,
		id, f.tenantID, isActive)
	require.NoError(t, err)

	return id
}

func (f fixture) updateResource(t *testing.T, id uuid.UUID, body string) int {
	t.Helper()

	req := httptest.NewRequest(http.MethodPut, "/v1/resources/"+id.String(), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	f.router.ServeHTTP(w, req)

	return w.Code
}

func (f fixture) findResource(t *testing.T, id uuid.UUID) db.FindResourceByIdRow {
	t.Helper()

	r, err := db.Query.FindResourceById(context.Background(), f.database.Primary(), id)
	require.NoError(t, err)

	return r
}

func TestHandle(t *testing.T) {
	t.Parallel()

	t.Run("updates details and keeps sort order", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t, featureflags.Static())
		id := f.insertResource(t, true)

		require.Equal(t, http.StatusNoContent, f.updateResource(t, id,
			`{"name":"Ana","type":"stylist","avatarUrl":"https://example.com/a.png","isActive":true}`))

		r := f.findResource(t, id)
		require.Equal(t, "Ana", r.Name)
		require.Equal(t, "stylist", r.Type)
		require.Equal(t, "https://example.com/a.png", r.AvatarUrl)
		require.True(t, r.IsActive)
		require.Equal(t, int32(7), r.SortOrder)
	})

	t.Run("deactivates a resource", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t, featureflags.Static())
		id := f.insertResource(t, true)

		require.Equal(t, http.StatusNoContent, f.updateResource(t, id,
			`{"name":"Carlos","type":"barber","isActive":false}`))
		require.False(t, f.findResource(t, id).IsActive)
	})

	t.Run("rejects a request without isActive", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t, featureflags.Static())
		id := f.insertResource(t, true)

		require.Equal(t, http.StatusBadRequest, f.updateResource(t, id,
			`{"name":"Carlos","type":"barber"}`))
		require.True(t, f.findResource(t, id).IsActive)
	})

	t.Run("reactivation within quota succeeds", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t, featureflags.Static(featureflags.Billing))
		id := f.insertResource(t, false)

		require.Equal(t, http.StatusNoContent, f.updateResource(t, id,
			`{"name":"Carlos","type":"barber","isActive":true}`))
		require.True(t, f.findResource(t, id).IsActive)
	})

	t.Run("reactivation beyond quota is forbidden", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t, featureflags.Static(featureflags.Billing))
		f.insertResource(t, true)
		id := f.insertResource(t, false)

		require.Equal(t, http.StatusForbidden, f.updateResource(t, id,
			`{"name":"Carlos","type":"barber","isActive":true}`))
		require.False(t, f.findResource(t, id).IsActive)
	})

	t.Run("editing an active resource at quota succeeds", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t, featureflags.Static(featureflags.Billing))
		id := f.insertResource(t, true)

		require.Equal(t, http.StatusNoContent, f.updateResource(t, id,
			`{"name":"Ana","type":"barber","isActive":true}`))
	})
}
