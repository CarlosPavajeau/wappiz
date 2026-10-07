package services_delete

import (
	"context"
	"net/http"
	"net/http/httptest"
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

	insertTenant := func() uuid.UUID {
		id := uuid.New()
		_, err := database.Primary().ExecContext(ctx,
			`INSERT INTO tenants (id, name, slug, month_reset_at) VALUES ($1, 'Barber Kings', $2, now())`,
			id, "barber-"+id.String())
		require.NoError(t, err)
		return id
	}
	tenantID := insertTenant()

	h := &Handler{DB: database}
	r := gin.New()
	r.Use(middleware.WithErrorHandling())
	r.Use(func(c *gin.Context) {
		c.Set("tenant_id", tenantID)
		c.Next()
	})
	r.DELETE(h.Path(), server.ToGinHandler(h))

	call := func(id uuid.UUID) int {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodDelete, "/v1/services/"+id.String(), nil))
		return w.Code
	}

	insert := func(owner uuid.UUID, deleted bool) uuid.UUID {
		id := uuid.New()
		_, err := database.Primary().ExecContext(ctx,
			`INSERT INTO services (id, tenant_id, name, duration_minutes, price, deleted_at)
			 VALUES ($1, $2, 'Corte', 30, 20000, CASE WHEN $3 THEN now() END)`,
			id, owner, deleted)
		require.NoError(t, err)
		return id
	}

	t.Run("deletes a live service and keeps is_active", func(t *testing.T) {
		id := insert(tenantID, false)
		require.Equal(t, http.StatusOK, call(id))

		var deleted, active bool
		err := database.Primary().QueryRowContext(ctx,
			`SELECT deleted_at IS NOT NULL, is_active FROM services WHERE id = $1`, id).Scan(&deleted, &active)
		require.NoError(t, err)
		require.True(t, deleted)
		require.True(t, active)
	})

	t.Run("returns not found for a deleted service", func(t *testing.T) {
		require.Equal(t, http.StatusNotFound, call(insert(tenantID, true)))
	})

	t.Run("returns not found for another tenant's service", func(t *testing.T) {
		id := insert(insertTenant(), false)
		require.Equal(t, http.StatusNotFound, call(id))

		var deleted bool
		err := database.Primary().QueryRowContext(ctx,
			`SELECT deleted_at IS NOT NULL FROM services WHERE id = $1`, id).Scan(&deleted)
		require.NoError(t, err)
		require.False(t, deleted)
	})
}
