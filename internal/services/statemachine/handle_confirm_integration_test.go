package statemachine

import (
	"context"
	"database/sql"
	"encoding/json"
	"sync"
	"testing"
	"time"
	"wappiz/internal/events"
	"wappiz/internal/services/plans"
	"wappiz/internal/services/slotfinder"
	"wappiz/internal/testutil"
	"wappiz/pkg/db"
	"wappiz/pkg/whatsapp"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

// recordingWhatsapp keeps the texts the bot sends. Other methods are not
// expected on these paths and panic through the nil embedded interface.
type recordingWhatsapp struct {
	whatsapp.Client
	mu    sync.Mutex
	texts []string
}

func (w *recordingWhatsapp) SendText(_ context.Context, _, _, _, body string) error {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.texts = append(w.texts, body)
	return nil
}

func (w *recordingWhatsapp) sent() []string {
	w.mu.Lock()
	defer w.mu.Unlock()
	return append([]string(nil), w.texts...)
}

// alwaysBookable keeps working hours out of these tests.
type alwaysBookable struct{ slotfinder.SlotFinderService }

func (alwaysBookable) IsBookable(context.Context, slotfinder.IsBookableParams) (bool, error) {
	return true, nil
}

type unlimitedPlan struct{ plans.Service }

func (unlimitedPlan) AppointmentLimit(context.Context, uuid.UUID) (sql.NullInt32, error) {
	return sql.NullInt32{}, nil
}

type confirmFixture struct {
	database   db.Database
	whatsapp   *recordingWhatsapp
	svc        *service
	msg        IncomingMessage
	session    db.ConversationSession
	customer   db.FindCustomerByPhoneNumberRow
	resourceID uuid.UUID
	serviceID  uuid.UUID
}

func newConfirmFixture(t *testing.T) confirmFixture {
	t.Helper()

	database := testutil.NewHarness(t).DB
	ctx := context.Background()
	exec := func(query string, args ...any) {
		_, err := database.Primary().ExecContext(ctx, query, args...)
		require.NoError(t, err)
	}

	tenantID, configID, customerID := uuid.New(), uuid.New(), uuid.New()
	resourceID, serviceID, sessionID := uuid.New(), uuid.New(), uuid.New()
	phone := "573001234567"

	exec(`INSERT INTO tenants (id, name, slug, month_reset_at) VALUES ($1, 'Barber Kings', $2, now())`,
		tenantID, "barber-"+tenantID.String())
	exec(`INSERT INTO tenant_whatsapp_configs (id, tenant_id) VALUES ($1, $2)`, configID, tenantID)
	exec(`INSERT INTO customers (id, tenant_id, phone_number, name) VALUES ($1, $2, $3, 'Ana')`,
		customerID, tenantID, phone)
	exec(`INSERT INTO resources (id, tenant_id, name, type) VALUES ($1, $2, 'Carlos', 'barber')`,
		resourceID, tenantID)
	exec(`INSERT INTO services (id, tenant_id, name, duration_minutes, price) VALUES ($1, $2, 'Corte', 30, 20000)`,
		serviceID, tenantID)
	exec(`INSERT INTO resource_services (resource_id, service_id) VALUES ($1, $2)`, resourceID, serviceID)

	startsAt := time.Now().Add(24 * time.Hour).Truncate(time.Minute)
	data, err := json.Marshal(SessionData{ServiceID: &serviceID, ResourceID: &resourceID, StartsAt: &startsAt})
	require.NoError(t, err)
	exec(`INSERT INTO conversation_sessions (id, tenant_id, whatsapp_config_id, customer_id, step, data, expires_at)
	      VALUES ($1, $2, $3, $4, $5, $6, now() + interval '30 minutes')`,
		sessionID, tenantID, configID, customerID, string(StepConfirm), data)

	session, err := db.Query.FindCustomerActiveConversationSession(ctx, database.Primary(),
		db.FindCustomerActiveConversationSessionParams{TenantID: tenantID, CustomerID: customerID})
	require.NoError(t, err)
	customer, err := db.Query.FindCustomerByPhoneNumber(ctx, database.Primary(),
		db.FindCustomerByPhoneNumberParams{TenantID: tenantID, PhoneNumber: phone})
	require.NoError(t, err)

	wa := &recordingWhatsapp{}
	confirmYes := "confirm_yes"

	return confirmFixture{
		database: database,
		whatsapp: wa,
		svc: New(Config{
			DB:         database,
			Whatsapp:   wa,
			SlotFinder: alwaysBookable{},
			Publisher:  events.NewPublisher(),
			Plans:      unlimitedPlan{},
		}),
		msg: IncomingMessage{
			TenantID:         tenantID,
			WhatsappConfigID: configID,
			From:             phone,
			InteractiveID:    &confirmYes,
		},
		session:    session,
		customer:   customer,
		resourceID: resourceID,
		serviceID:  serviceID,
	}
}

func (f confirmFixture) appointmentCount(t *testing.T) int {
	t.Helper()

	var count int
	err := f.database.Primary().QueryRowContext(context.Background(),
		`SELECT count(*) FROM appointments WHERE customer_id = $1`, f.session.CustomerID).Scan(&count)
	require.NoError(t, err)
	return count
}

func (f confirmFixture) sessionExists(t *testing.T) bool {
	t.Helper()

	var exists bool
	err := f.database.Primary().QueryRowContext(context.Background(),
		`SELECT EXISTS (SELECT 1 FROM conversation_sessions WHERE id = $1)`, f.session.ID).Scan(&exists)
	require.NoError(t, err)
	return exists
}

func TestHandleConfirm(t *testing.T) {
	t.Parallel()

	t.Run("books the appointment", func(t *testing.T) {
		t.Parallel()
		f := newConfirmFixture(t)

		require.NoError(t, f.svc.handleConfirm(context.Background(), f.msg, f.session, f.customer))
		require.Equal(t, 1, f.appointmentCount(t))
		require.False(t, f.sessionExists(t))
	})

	// A deletion that commits after the bot validated its choices but before
	// it writes must stop the write. The deletion is held open while the bot
	// runs, so without the lock the bot would insert without waiting.
	for _, target := range []string{"resources", "services"} {
		t.Run("waits for a concurrent "+target+" deletion and tells the customer", func(t *testing.T) {
			t.Parallel()
			f := newConfirmFixture(t)
			ctx := context.Background()

			id := f.resourceID
			if target == "services" {
				id = f.serviceID
			}

			deletion, err := f.database.Primary().Begin(ctx)
			require.NoError(t, err)
			_, err = deletion.ExecContext(ctx, `UPDATE `+target+` SET deleted_at = now() WHERE id = $1`, id)
			require.NoError(t, err)

			result := make(chan error, 1)
			go func() { result <- f.svc.handleConfirm(ctx, f.msg, f.session, f.customer) }()

			select {
			case err := <-result:
				_ = deletion.Rollback()
				require.FailNow(t, "confirmation did not wait for the deletion", "err %v", err)
			case <-time.After(200 * time.Millisecond):
			}

			require.NoError(t, deletion.Commit())
			require.NoError(t, <-result)

			require.Zero(t, f.appointmentCount(t))
			require.False(t, f.sessionExists(t))
			require.Len(t, f.whatsapp.sent(), 1)
			require.Contains(t, f.whatsapp.sent()[0], "ya no está disponible")
		})
	}

	t.Run("tells the customer when the service was already deleted", func(t *testing.T) {
		t.Parallel()
		f := newConfirmFixture(t)

		_, err := f.database.Primary().ExecContext(context.Background(),
			`UPDATE services SET deleted_at = now() WHERE id = $1`, f.serviceID)
		require.NoError(t, err)

		require.NoError(t, f.svc.handleConfirm(context.Background(), f.msg, f.session, f.customer))
		require.Zero(t, f.appointmentCount(t))
		require.False(t, f.sessionExists(t))
		require.Contains(t, f.whatsapp.sent()[0], "ya no está disponible")
	})
}
