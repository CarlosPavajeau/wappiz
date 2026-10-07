package resources_get

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
	r.GET(h.Path(), server.ToGinHandler(h))

	call := func(id uuid.UUID) int {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/v1/resources/"+id.String(), nil))
		return w.Code
	}

	insert := func(deleted bool) uuid.UUID {
		id := uuid.New()
		_, err := database.Primary().ExecContext(ctx,
			`INSERT INTO resources (id, tenant_id, name, type, deleted_at)
			 VALUES ($1, $2, 'Carlos', 'barber', CASE WHEN $3 THEN now() END)`,
			id, tenantID, deleted)
		require.NoError(t, err)
		return id
	}

	t.Run("returns a live resource", func(t *testing.T) {
		require.Equal(t, http.StatusOK, call(insert(false)))
	})

	t.Run("returns not found for a deleted resource", func(t *testing.T) {
		require.Equal(t, http.StatusNotFound, call(insert(true)))
	})
}
