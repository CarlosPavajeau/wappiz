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

	// insertAppointment books the service for a fresh resource and customer,
	// starting at now() + startsIn.
	insertAppointment := func(serviceID uuid.UUID, status, startsIn string) {
		_, err := database.Primary().ExecContext(ctx,
			`WITH r AS (
			     INSERT INTO resources (tenant_id, name, type)
			     VALUES ($1, 'Carlos', 'barber') RETURNING id
			 ), c AS (
			     INSERT INTO customers (tenant_id, phone_number)
			     VALUES ($1, $5) RETURNING id
			 )
			 INSERT INTO appointments (tenant_id, resource_id, service_id, customer_id, starts_at, ends_at,
			                           status, price_at_booking, cancelled_at)
			 SELECT $1, r.id, $2, c.id, now() + $4::interval, now() + $4::interval + interval '30 minutes',
			        $3::text::appointment_status, 20000, CASE WHEN $3::text = 'cancelled' THEN now() END
			 FROM r, c`,
			tenantID, serviceID, status, startsIn, uuid.NewString()[:15])
		require.NoError(t, err)
	}

	isDeleted := func(id uuid.UUID) bool {
		var deleted bool
		err := database.Primary().QueryRowContext(ctx,
			`SELECT deleted_at IS NOT NULL FROM services WHERE id = $1`, id).Scan(&deleted)
		require.NoError(t, err)
		return deleted
	}

	t.Run("blocks deletion while appointments are upcoming", func(t *testing.T) {
		id := insert(tenantID, false)
		insertAppointment(id, "pending", "1 day")

		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodDelete, "/v1/services/"+id.String(), nil))
		require.Equal(t, http.StatusConflict, w.Code)
		require.Contains(t, w.Body.String(), "err:application:has_upcoming_appointments")
		require.Contains(t, w.Body.String(), "Este servicio tiene 1 cita programada.")
		require.False(t, isDeleted(id))
	})

	t.Run("ignores finished, cancelled and past appointments", func(t *testing.T) {
		id := insert(tenantID, false)
		insertAppointment(id, "completed", "-2 hours")
		insertAppointment(id, "cancelled", "1 day")
		insertAppointment(id, "pending", "-3 hours")

		require.Equal(t, http.StatusOK, call(id))
		require.True(t, isDeleted(id))
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
