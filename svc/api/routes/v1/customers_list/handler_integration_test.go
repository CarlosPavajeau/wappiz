package customers_list

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"wappiz/pkg/server"
	"wappiz/svc/api/internal/middleware"
	"wappiz/svc/api/internal/testutil"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

type fixture struct {
	router *gin.Engine
}

// newFixture seeds two tenants so every assertion also proves the tenant
// boundary holds: the other tenant's "José" must never leak into results.
func newFixture(t *testing.T) fixture {
	t.Helper()
	gin.SetMode(gin.TestMode)

	database := testutil.NewHarness(t).DB
	ctx := context.Background()
	tenantID, otherTenantID := uuid.New(), uuid.New()

	for _, id := range []uuid.UUID{tenantID, otherTenantID} {
		slug := "t-" + strings.ReplaceAll(id.String()[:8], "-", "")
		_, err := database.Primary().ExecContext(ctx,
			`INSERT INTO tenants (id, name, slug, month_reset_at) VALUES ($1, 'Tenant', $2, now())`, id, slug)
		require.NoError(t, err)
	}

	customers := []struct {
		tenantID uuid.UUID
		phone    string
		name     *string
		blocked  bool
	}{
		{tenantID, "573001112233", new("José Pérez"), false},
		{tenantID, "573004445566", new("Ana Gómez"), true},
		{tenantID, "573007778899", nil, false},
		{otherTenantID, "573001112234", new("José Otro"), false},
	}
	for i, cu := range customers {
		// Distinct created_at values make the newest-first order deterministic.
		_, err := database.Primary().ExecContext(ctx,
			`INSERT INTO customers (tenant_id, phone_number, name, is_blocked, created_at)
			 VALUES ($1, $2, $3, $4, now() - make_interval(mins => $5))`,
			cu.tenantID, cu.phone, cu.name, cu.blocked, len(customers)-i)
		require.NoError(t, err)
	}

	h := &Handler{DB: database}
	r := gin.New()
	r.Use(func(c *gin.Context) { c.Set("tenant_id", tenantID) })
	r.Use(middleware.WithErrorHandling())
	r.GET(h.Path(), server.ToGinHandler(h))

	return fixture{router: r}
}

func (f fixture) list(t *testing.T, rawQuery string) (int, PageResponse) {
	t.Helper()

	w := httptest.NewRecorder()
	f.router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/v1/customers?"+rawQuery, nil))

	var page PageResponse
	if w.Code == http.StatusOK {
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &page))
	}
	return w.Code, page
}

func phonesOf(page PageResponse) []string {
	phones := make([]string, len(page.Customers))
	for i, c := range page.Customers {
		phones[i] = c.PhoneNumber
	}
	return phones
}

func TestHandle_ListCustomers(t *testing.T) {
	f := newFixture(t)

	t.Run("lists the tenant's customers newest first", func(t *testing.T) {
		code, page := f.list(t, "")
		require.Equal(t, http.StatusOK, code)
		require.Equal(t, int64(3), page.Total)
		require.Equal(t, []string{"573007778899", "573004445566", "573001112233"}, phonesOf(page))
	})

	t.Run("matches names ignoring case and accents", func(t *testing.T) {
		_, page := f.list(t, "name=jose")
		require.Equal(t, int64(1), page.Total)
		require.Equal(t, []string{"573001112233"}, phonesOf(page))
	})

	t.Run("matches any fragment of the phone digits", func(t *testing.T) {
		_, page := f.list(t, "phone=300%20444")
		require.Equal(t, []string{"573004445566"}, phonesOf(page))
	})

	t.Run("filters by status", func(t *testing.T) {
		_, blocked := f.list(t, "status=blocked")
		require.Equal(t, []string{"573004445566"}, phonesOf(blocked))

		_, active := f.list(t, "status=active")
		require.Equal(t, int64(2), active.Total)
	})

	t.Run("paginates while reporting the full total", func(t *testing.T) {
		_, first := f.list(t, "limit=2&page=1")
		require.Equal(t, int64(3), first.Total)
		require.Equal(t, []string{"573007778899", "573004445566"}, phonesOf(first))

		_, second := f.list(t, "limit=2&page=2")
		require.Equal(t, int64(3), second.Total)
		require.Equal(t, []string{"573001112233"}, phonesOf(second))
	})

	t.Run("returns an empty list past the last page", func(t *testing.T) {
		code, page := f.list(t, "page=9")
		require.Equal(t, http.StatusOK, code)
		require.Equal(t, int64(3), page.Total)
		require.NotNil(t, page.Customers)
		require.Empty(t, page.Customers)
	})

	t.Run("rejects invalid filters", func(t *testing.T) {
		code, _ := f.list(t, "status=deleted")
		require.Equal(t, http.StatusBadRequest, code)
	})
}
