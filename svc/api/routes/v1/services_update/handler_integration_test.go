package services_update

import (
	"context"
	"database/sql"
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

func TestHandle(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	database := testutil.NewHarness(t).DB
	ctx := context.Background()
	tenantID := uuid.New()
	_, err := database.Primary().ExecContext(ctx,
		`INSERT INTO tenants (id, name, slug, month_reset_at) VALUES ($1, 'Barber Kings', $2, now())`,
		tenantID, "barber-"+tenantID.String())
	require.NoError(t, err)

	h := &Handler{DB: database}
	r := gin.New()
	r.Use(middleware.WithErrorHandling())
	r.Use(func(c *gin.Context) {
		c.Set("tenant_id", tenantID)
		c.Next()
	})
	r.PUT(h.Path(), server.ToGinHandler(h))

	call := func(id uuid.UUID, body string) int {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPut, "/v1/services/"+id.String(), strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
		return w.Code
	}

	insert := func(deleted bool) uuid.UUID {
		id := uuid.New()
		_, err := database.Primary().ExecContext(ctx,
			`INSERT INTO services (id, tenant_id, name, description, duration_minutes, price, sort_order, deleted_at)
			 VALUES ($1, $2, 'Corte', 'Clásico', 30, 20000, 7, CASE WHEN $3 THEN now() END)`,
			id, tenantID, deleted)
		require.NoError(t, err)
		return id
	}

	t.Run("updates fields and keeps sort order", func(t *testing.T) {
		id := insert(false)
		require.Equal(t, http.StatusNoContent, call(id,
			`{"name":"Corte y barba","description":"Con toalla","durationMinutes":45,"price":30000,"isActive":false}`))

		var (
			name        string
			description sql.NullString
			active      bool
			sortOrder   int32
		)
		err := database.Primary().QueryRowContext(ctx,
			`SELECT name, description, is_active, sort_order FROM services WHERE id = $1`, id).
			Scan(&name, &description, &active, &sortOrder)
		require.NoError(t, err)
		require.Equal(t, "Corte y barba", name)
		require.Equal(t, sql.NullString{String: "Con toalla", Valid: true}, description)
		require.False(t, active)
		require.Equal(t, int32(7), sortOrder)
	})

	t.Run("stores an empty description as null", func(t *testing.T) {
		id := insert(false)
		require.Equal(t, http.StatusNoContent, call(id,
			`{"name":"Corte","description":"","durationMinutes":30,"price":20000,"isActive":true}`))

		var description sql.NullString
		err := database.Primary().QueryRowContext(ctx,
			`SELECT description FROM services WHERE id = $1`, id).Scan(&description)
		require.NoError(t, err)
		require.False(t, description.Valid)
	})

	t.Run("rejects a request without isActive", func(t *testing.T) {
		require.Equal(t, http.StatusBadRequest, call(insert(false),
			`{"name":"Corte","durationMinutes":30,"price":20000}`))
	})

	t.Run("returns not found for a deleted service", func(t *testing.T) {
		require.Equal(t, http.StatusNotFound, call(insert(true),
			`{"name":"Corte","durationMinutes":30,"price":20000,"isActive":true}`))
	})
}
