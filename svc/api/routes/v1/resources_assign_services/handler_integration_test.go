package resources_assign_services

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"wappiz/pkg/server"
	"wappiz/svc/api/internal/middleware"
	"wappiz/internal/testutil"

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
	r.PUT(h.Path(), server.ToGinHandler(h))

	call := func(resourceID uuid.UUID, serviceIDs ...uuid.UUID) int {
		quoted := make([]string, len(serviceIDs))
		for i, id := range serviceIDs {
			quoted[i] = fmt.Sprintf("%q", id.String())
		}
		body := `{"serviceIds":[` + strings.Join(quoted, ",") + `]}`

		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPut, "/v1/resources/"+resourceID.String()+"/services", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
		return w.Code
	}

	insertResource := func() uuid.UUID {
		id := uuid.New()
		_, err := database.Primary().ExecContext(ctx,
			`INSERT INTO resources (id, tenant_id, name, type) VALUES ($1, $2, 'Carlos', 'barber')`,
			id, tenantID)
		require.NoError(t, err)
		return id
	}

	insertService := func(owner uuid.UUID, deleted bool) uuid.UUID {
		id := uuid.New()
		_, err := database.Primary().ExecContext(ctx,
			`INSERT INTO services (id, tenant_id, name, duration_minutes, price, deleted_at)
			 VALUES ($1, $2, 'Corte', 30, 20000, CASE WHEN $3 THEN now() END)`,
			id, owner, deleted)
		require.NoError(t, err)
		return id
	}

	linked := func(resourceID uuid.UUID) []uuid.UUID {
		rows, err := database.Primary().QueryContext(ctx,
			`SELECT service_id FROM resource_services WHERE resource_id = $1 ORDER BY service_id`, resourceID)
		require.NoError(t, err)
		defer rows.Close()

		ids := []uuid.UUID{}
		for rows.Next() {
			var id uuid.UUID
			require.NoError(t, rows.Scan(&id))
			ids = append(ids, id)
		}
		require.NoError(t, rows.Err())
		return ids
	}

	t.Run("replaces the links, ignoring duplicate ids", func(t *testing.T) {
		resourceID := insertResource()
		old := insertService(tenantID, false)
		require.Equal(t, http.StatusOK, call(resourceID, old))

		next := insertService(tenantID, false)
		require.Equal(t, http.StatusOK, call(resourceID, next, next))
		require.Equal(t, []uuid.UUID{next}, linked(resourceID))
	})

	t.Run("rejects another tenant's service and keeps the previous links", func(t *testing.T) {
		resourceID := insertResource()
		own := insertService(tenantID, false)
		require.Equal(t, http.StatusOK, call(resourceID, own))

		require.Equal(t, http.StatusBadRequest, call(resourceID, own, insertService(insertTenant(), false)))
		require.Equal(t, []uuid.UUID{own}, linked(resourceID))
	})

	t.Run("rejects a deleted service", func(t *testing.T) {
		resourceID := insertResource()
		require.Equal(t, http.StatusBadRequest, call(resourceID, insertService(tenantID, true)))
		require.Empty(t, linked(resourceID))
	})

	t.Run("clears the links with an empty list", func(t *testing.T) {
		resourceID := insertResource()
		require.Equal(t, http.StatusOK, call(resourceID, insertService(tenantID, false)))
		require.Equal(t, http.StatusOK, call(resourceID))
		require.Empty(t, linked(resourceID))
	})
}
