package resources_delete

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"wappiz/internal/services/booking"
	"wappiz/pkg/codes"
	"wappiz/pkg/fault"
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
	r.DELETE(h.Path(), server.ToGinHandler(h))

	call := func(id uuid.UUID) int {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodDelete, "/v1/resources/"+id.String(), nil))
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

	// insertAppointment books the resource for a fresh service and customer,
	// starting at now() + startsIn.
	insertAppointment := func(resourceID uuid.UUID, status, startsIn string) {
		_, err := database.Primary().ExecContext(ctx,
			`WITH s AS (
			     INSERT INTO services (tenant_id, name, duration_minutes, price)
			     VALUES ($1, 'Corte', 30, 20000) RETURNING id
			 ), c AS (
			     INSERT INTO customers (tenant_id, phone_number)
			     VALUES ($1, $5) RETURNING id
			 )
			 INSERT INTO appointments (tenant_id, resource_id, service_id, customer_id, starts_at, ends_at,
			                           status, price_at_booking, cancelled_at)
			 SELECT $1, $2, s.id, c.id, now() + $4::interval, now() + $4::interval + interval '30 minutes',
			        $3::text::appointment_status, 20000, CASE WHEN $3::text = 'cancelled' THEN now() END
			 FROM s, c`,
			tenantID, resourceID, status, startsIn, uuid.NewString()[:15])
		require.NoError(t, err)
	}

	isDeleted := func(id uuid.UUID) bool {
		var deleted bool
		err := database.Primary().QueryRowContext(ctx,
			`SELECT deleted_at IS NOT NULL FROM resources WHERE id = $1`, id).Scan(&deleted)
		require.NoError(t, err)
		return deleted
	}

	t.Run("deletes a live resource", func(t *testing.T) {
		require.Equal(t, http.StatusOK, call(insert(false)))
	})

	t.Run("blocks deletion while appointments are upcoming", func(t *testing.T) {
		for _, status := range []string{"pending", "confirmed", "check_in", "in_progress"} {
			t.Run(status, func(t *testing.T) {
				id := insert(false)
				insertAppointment(id, status, "1 day")

				require.Equal(t, http.StatusConflict, call(id))
				require.False(t, isDeleted(id))
			})
		}
	})

	t.Run("waits for an in-flight booking and then blocks", func(t *testing.T) {
		id := insert(false)
		serviceID := uuid.New()
		_, err := database.Primary().ExecContext(ctx,
			`INSERT INTO services (id, tenant_id, name, duration_minutes, price) VALUES ($1, $2, 'Corte', 30, 20000)`,
			serviceID, tenantID)
		require.NoError(t, err)

		// A booking that has taken its locks but not committed yet.
		tx, err := database.Primary().Begin(ctx)
		require.NoError(t, err)
		require.NoError(t, booking.LockTargets(ctx, tx, tenantID, id, serviceID))

		result := make(chan int, 1)
		go func() { result <- call(id) }()

		select {
		case code := <-result:
			require.FailNow(t, "deletion did not wait for the booking", "status %d", code)
		case <-time.After(200 * time.Millisecond):
		}

		_, err = tx.ExecContext(ctx,
			`WITH c AS (INSERT INTO customers (tenant_id, phone_number) VALUES ($1, $4) RETURNING id)
			 INSERT INTO appointments (tenant_id, resource_id, service_id, customer_id, starts_at, ends_at, price_at_booking)
			 SELECT $1, $2, $3, c.id, now() + interval '1 day', now() + interval '1 day 30 minutes', 20000 FROM c`,
			tenantID, id, serviceID, uuid.NewString()[:15])
		require.NoError(t, err)
		require.NoError(t, tx.Commit())

		require.Equal(t, http.StatusConflict, <-result)
		require.False(t, isDeleted(id))
	})

	t.Run("rejects a booking once the resource is deleted", func(t *testing.T) {
		id := insert(true)
		tx, err := database.Primary().Begin(ctx)
		require.NoError(t, err)
		defer func() { _ = tx.Rollback() }()

		err = booking.LockTargets(ctx, tx, tenantID, id, uuid.New())
		code, ok := fault.GetCode(err)
		require.True(t, ok)
		require.Equal(t, codes.ErrorsNotFound, code)
	})

	t.Run("ignores finished, cancelled and past appointments", func(t *testing.T) {
		id := insert(false)
		insertAppointment(id, "completed", "-2 hours")
		insertAppointment(id, "cancelled", "1 day")
		insertAppointment(id, "confirmed", "-3 hours")

		require.Equal(t, http.StatusOK, call(id))
		require.True(t, isDeleted(id))
	})

	t.Run("returns not found for a deleted resource", func(t *testing.T) {
		require.Equal(t, http.StatusNotFound, call(insert(true)))
	})
}
