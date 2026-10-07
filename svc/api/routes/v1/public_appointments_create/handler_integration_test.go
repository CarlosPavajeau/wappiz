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
	"wappiz/internal/services/featureflags"
	"wappiz/internal/services/plans"
	"wappiz/internal/services/slotfinder"
	"wappiz/pkg/db"
	"wappiz/pkg/server"
	"wappiz/svc/api/internal/middleware"
	"wappiz/internal/testutil"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

type fakeTurnstile struct{ ok bool }

func (f fakeTurnstile) Verify(context.Context, string, string) (bool, error) { return f.ok, nil }

type fixture struct {
	database   db.Database
	router     *gin.Engine
	tenantID   uuid.UUID
	slug       string
	serviceID  uuid.UUID
	resourceID uuid.UUID
	startsAt   time.Time
}

type fixtureOptions struct {
	publicBookingEnabled bool
	whatsappReady        bool
	captchaOK            bool
	// billing turns on the billing feature flag, which enforces plan limits.
	billing bool
}

// ready is a tenant that accepts public bookings from a human caller.
var ready = fixtureOptions{publicBookingEnabled: true, whatsappReady: true, captchaOK: true}

func newFixture(t *testing.T, opts fixtureOptions) fixture {
	t.Helper()
	gin.SetMode(gin.TestMode)

	database := testutil.NewHarness(t).DB
	ctx := context.Background()
	tenantID, serviceID, resourceID := uuid.New(), uuid.New(), uuid.New()
	slug := "barber-" + strings.ReplaceAll(uuid.NewString()[:8], "-", "")

	_, err := database.Primary().ExecContext(ctx,
		`INSERT INTO tenants (id, name, slug, month_reset_at, settings) VALUES ($1, 'Barber Kings', $2, now(), $3)`,
		tenantID, slug, fmt.Sprintf(`{"publicBookingEnabled": %t}`, opts.publicBookingEnabled))
	require.NoError(t, err)
	_, err = database.Primary().ExecContext(ctx,
		`INSERT INTO tenant_whatsapp_configs (tenant_id, phone_number_id, access_token, is_active) VALUES ($1, $2, 'token', $3)`,
		tenantID, "pn-"+slug, opts.whatsappReady)
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

	flags := featureflags.Static()
	if opts.billing {
		flags = featureflags.Static(featureflags.Billing)
	}

	h := &Handler{
		DB: database,
		Booking: booking.New(booking.Config{
			DB:         database,
			SlotFinder: slotfinder.New(database),
			Publisher:  events.NewPublisher(),
			Plans:      plans.New(plans.Config{DB: database, Flags: flags, Environment: "sandbox"}),
		}),
		Turnstile: fakeTurnstile{ok: opts.captchaOK},
	}
	r := gin.New()
	r.Use(middleware.WithErrorHandling())
	r.POST(h.Path(), server.ToGinHandler(h))

	return fixture{
		database:   database,
		router:     r,
		tenantID:   tenantID,
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

// subscribe gives the tenant an active plan with the given features JSON.
func (f fixture) subscribe(t *testing.T, features string) {
	t.Helper()
	ctx := context.Background()

	planID := uuid.New()
	_, err := f.database.Primary().ExecContext(ctx,
		`INSERT INTO plans (id, external_id, name, features, environment) VALUES ($1, $2, 'Pro', $3, 'sandbox')`,
		planID, "prod-"+planID.String(), features)
	require.NoError(t, err)

	_, err = f.database.Primary().ExecContext(ctx,
		`INSERT INTO subscriptions (tenant_id, plan_id, external_id, external_customer_id, status, environment)
		 VALUES ($1, $2, $3, 'cus-1', 'active', 'sandbox')`,
		f.tenantID, planID, "sub-"+planID.String())
	require.NoError(t, err)
}

func (f fixture) setAppointmentsThisMonth(t *testing.T, count int) {
	t.Helper()

	_, err := f.database.Primary().ExecContext(context.Background(),
		`UPDATE tenants SET appointments_this_month = $2 WHERE id = $1`, f.tenantID, count)
	require.NoError(t, err)
}

func (f fixture) appointmentsThisMonth(t *testing.T) int {
	t.Helper()

	var count int
	require.NoError(t, f.database.Primary().QueryRowContext(context.Background(),
		`SELECT appointments_this_month FROM tenants WHERE id = $1`, f.tenantID).Scan(&count))
	return count
}

func (f fixture) appointments(t *testing.T) int {
	t.Helper()

	var count int
	require.NoError(t, f.database.Primary().QueryRowContext(context.Background(),
		`SELECT count(*) FROM appointments WHERE tenant_id = $1`, f.tenantID).Scan(&count))
	return count
}

func TestHandle_PublicBookingPlanLimits(t *testing.T) {
	billing := ready
	billing.billing = true

	t.Run("billing flag off ignores the monthly cap but keeps counting", func(t *testing.T) {
		f := newFixture(t, ready)
		f.setAppointmentsThisMonth(t, 30)

		w := f.book(t, "573001234567")
		require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
		require.Equal(t, 31, f.appointmentsThisMonth(t))
	})

	t.Run("free plan books up to its monthly cap", func(t *testing.T) {
		f := newFixture(t, billing)
		f.setAppointmentsThisMonth(t, 29)

		w := f.book(t, "573001234567")
		require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
		require.Equal(t, 30, f.appointmentsThisMonth(t))
	})

	t.Run("free plan rejects a booking at its monthly cap", func(t *testing.T) {
		f := newFixture(t, billing)
		f.setAppointmentsThisMonth(t, 30)

		w := f.book(t, "573001234567")
		require.Equal(t, http.StatusForbidden, w.Code, w.Body.String())
		require.Equal(t, 30, f.appointmentsThisMonth(t))
		require.Zero(t, f.appointments(t))
	})

	t.Run("paid plan cap replaces the free one", func(t *testing.T) {
		f := newFixture(t, billing)
		f.subscribe(t, `{"maxAppointmentsPerMonth": 50}`)
		f.setAppointmentsThisMonth(t, 30)

		w := f.book(t, "573001234567")
		require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
		require.Equal(t, 31, f.appointmentsThisMonth(t))
	})

	t.Run("paid plan rejects a booking at its monthly cap", func(t *testing.T) {
		f := newFixture(t, billing)
		f.subscribe(t, `{"maxAppointmentsPerMonth": 50}`)
		f.setAppointmentsThisMonth(t, 50)

		w := f.book(t, "573001234567")
		require.Equal(t, http.StatusForbidden, w.Code, w.Body.String())
		require.Zero(t, f.appointments(t))
	})

	t.Run("unlimited plan has no monthly cap", func(t *testing.T) {
		f := newFixture(t, billing)
		f.subscribe(t, `{}`)
		f.setAppointmentsThisMonth(t, 1000)

		w := f.book(t, "573001234567")
		require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
		require.Equal(t, 1001, f.appointmentsThisMonth(t))
	})
}

func TestHandle_PublicBooking(t *testing.T) {
	t.Run("books, creates the customer and publishes a public event", func(t *testing.T) {
		f := newFixture(t, ready)

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

	t.Run("rejects a taken slot with 409 without creating the customer", func(t *testing.T) {
		f := newFixture(t, ready)

		require.Equal(t, http.StatusCreated, f.book(t, "573001234567").Code)
		w := f.book(t, "573009876543")
		require.Equal(t, http.StatusConflict, w.Code, w.Body.String())

		var customers int
		require.NoError(t, f.database.Primary().QueryRowContext(context.Background(),
			`SELECT count(*) FROM customers WHERE phone_number = '573009876543'`).Scan(&customers))
		require.Zero(t, customers)
	})

	t.Run("returns 404 when the page is disabled", func(t *testing.T) {
		f := newFixture(t, fixtureOptions{whatsappReady: true, captchaOK: true})

		w := f.book(t, "573001234567")
		require.Equal(t, http.StatusNotFound, w.Code, w.Body.String())
	})

	t.Run("returns 404 when whatsapp cannot send the confirmation", func(t *testing.T) {
		f := newFixture(t, fixtureOptions{publicBookingEnabled: true, captchaOK: true})

		w := f.book(t, "573001234567")
		require.Equal(t, http.StatusNotFound, w.Code, w.Body.String())

		var bookings int
		require.NoError(t, f.database.Primary().QueryRowContext(context.Background(),
			`SELECT count(*) FROM appointments`).Scan(&bookings))
		require.Zero(t, bookings)
	})

	t.Run("rejects a failed captcha with 400", func(t *testing.T) {
		f := newFixture(t, fixtureOptions{publicBookingEnabled: true, whatsappReady: true})

		w := f.book(t, "573001234567")
		require.Equal(t, http.StatusBadRequest, w.Code, w.Body.String())
	})
}
