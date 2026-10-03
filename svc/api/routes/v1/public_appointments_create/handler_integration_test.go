package public_appointments_create

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"wappiz/internal/events"
	"wappiz/internal/services/booking"
	"wappiz/internal/services/slotfinder"
	"wappiz/pkg/db"
	"wappiz/pkg/server"
	"wappiz/svc/api/internal/middleware"
	"wappiz/svc/api/internal/testutil"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

type fakeTurnstile struct{ ok bool }

func (f fakeTurnstile) Verify(context.Context, string, string) (bool, error) { return f.ok, nil }

type fixture struct {
	database   db.Database
	router     *gin.Engine
	slug       string
	serviceID  uuid.UUID
	resourceID uuid.UUID
	startsAt   time.Time
}

func newFixture(t *testing.T, publicBookingEnabled bool, captchaOK bool) fixture {
	t.Helper()
	gin.SetMode(gin.TestMode)

	database := testutil.NewHarness(t).DB
	ctx := context.Background()
	tenantID, serviceID, resourceID := uuid.New(), uuid.New(), uuid.New()
	slug := "barber-" + strings.ReplaceAll(uuid.NewString()[:8], "-", "")

	_, err := database.Primary().ExecContext(ctx,
		`INSERT INTO tenants (id, name, slug, month_reset_at, settings) VALUES ($1, 'Barber Kings', $2, now(), $3)`,
		tenantID, slug, fmt.Sprintf(`{"publicBookingEnabled": %t}`, publicBookingEnabled))
	require.NoError(t, err)
	_, err = database.Primary().ExecContext(ctx,
		`INSERT INTO services (id, tenant_id, name, duration_minutes, price) VALUES ($1, $2, 'Corte', 30, 25000)`,
		serviceID, tenantID)
	require.NoError(t, err)
	_, err = database.Primary().ExecContext(ctx,
		`INSERT INTO resources (id, tenant_id, name) VALUES ($1, $2, 'Luis')`,
		resourceID, tenantID)
	require.NoError(t, err)
	_, err = database.Primary().ExecContext(ctx,
		`INSERT INTO resource_services (resource_id, service_id) VALUES ($1, $2)`,
		resourceID, serviceID)
	require.NoError(t, err)
	for day := range 7 {
		_, err = database.Primary().ExecContext(ctx,
			`INSERT INTO working_hours (resource_id, day_of_week, start_time, end_time) VALUES ($1, $2, '00:00', '23:59')`,
			resourceID, day)
		require.NoError(t, err)
	}

	loc, err := time.LoadLocation("America/Bogota")
	require.NoError(t, err)
	tomorrow := time.Now().In(loc).AddDate(0, 0, 1)
	startsAt := time.Date(tomorrow.Year(), tomorrow.Month(), tomorrow.Day(), 10, 0, 0, 0, loc)

	h := &Handler{
		DB: database,
		Booking: booking.New(booking.Config{
			DB:          database,
			SlotFinder:  slotfinder.New(database),
			Publisher:   events.NewPublisher(),
			Environment: "sandbox",
		}),
		Turnstile: fakeTurnstile{ok: captchaOK},
	}
	r := gin.New()
	r.Use(middleware.WithErrorHandling())
	r.POST(h.Path(), server.ToGinHandler(h))

	return fixture{
		database:   database,
		router:     r,
		slug:       slug,
		serviceID:  serviceID,
		resourceID: resourceID,
		startsAt:   startsAt,
	}
}

func (f fixture) book(t *testing.T, phone string) *httptest.ResponseRecorder {
	t.Helper()

	body, err := json.Marshal(map[string]string{
		"serviceId":      f.serviceID.String(),
		"resourceId":     f.resourceID.String(),
		"startsAt":       f.startsAt.Format(time.RFC3339),
		"customerName":   "Ana Gómez",
		"phoneNumber":    phone,
		"turnstileToken": "token",
	})
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/v1/public/tenants/"+f.slug+"/appointments", strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	f.router.ServeHTTP(w, req)
	return w
}

func TestHandle_PublicBooking(t *testing.T) {
	t.Run("books, creates the customer and publishes a public event", func(t *testing.T) {
		f := newFixture(t, true, true)

		w := f.book(t, "+57 300 123 4567")
		require.Equal(t, http.StatusCreated, w.Code, w.Body.String())

		var customerName string
		require.NoError(t, f.database.Primary().QueryRowContext(context.Background(),
			`SELECT name FROM customers WHERE phone_number = '573001234567'`).Scan(&customerName))
		require.Equal(t, "Ana Gómez", customerName)

		var source string
		require.NoError(t, f.database.Primary().QueryRowContext(context.Background(),
			`SELECT payload->>'source' FROM domain_events WHERE event_type = $1`,
			string(events.TypeAppointmentCreated)).Scan(&source))
		require.Equal(t, string(events.AppointmentCreatedSourcePublic), source)
	})

	t.Run("rejects a taken slot with 409", func(t *testing.T) {
		f := newFixture(t, true, true)

		require.Equal(t, http.StatusCreated, f.book(t, "573001234567").Code)
		w := f.book(t, "573009876543")
		require.Equal(t, http.StatusConflict, w.Code, w.Body.String())
	})

	t.Run("returns 404 when the page is disabled", func(t *testing.T) {
		f := newFixture(t, false, true)

		w := f.book(t, "573001234567")
		require.Equal(t, http.StatusNotFound, w.Code, w.Body.String())
	})

	t.Run("rejects a failed captcha with 400", func(t *testing.T) {
		f := newFixture(t, true, false)

		w := f.book(t, "573001234567")
		require.Equal(t, http.StatusBadRequest, w.Code, w.Body.String())
	})
}
