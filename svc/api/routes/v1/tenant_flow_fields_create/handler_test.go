package tenant_flow_fields_create

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"wappiz/pkg/db"
	"wappiz/pkg/server"
	"wappiz/svc/api/internal/middleware"
	"wappiz/svc/api/internal/testutil"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestHandle_CreatesCustomFlowField(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	database := testutil.NewHarness(t).DB

	tenantID := uuid.New()
	insertTenant(t, database.Primary(), tenantID, "tenant-flow-create")

	h := &Handler{DB: database}
	r := gin.New()
	r.Use(middleware.WithErrorHandling())
	r.Use(func(c *gin.Context) {
		c.Set("tenant_id", tenantID)
		c.Next()
	})
	r.POST("/v1/tenants/flow-fields", server.ToGinHandler(h))

	req := httptest.NewRequest(
		http.MethodPost,
		"/v1/tenants/flow-fields",
		strings.NewReader(`{"question":"  Cual es tu correo?  ","isRequired":true,"isOneTime":true,"sortOrder":7}`),
	)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())

	var body Response
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.NotEmpty(t, body.ID)
	require.True(t, strings.HasPrefix(body.FieldKey, "custom_"))
	require.Equal(t, "custom", body.FieldType)
	require.Equal(t, "Cual es tu correo?", body.Question)
	require.True(t, body.IsRequired)
	require.True(t, body.IsOneTime)
	require.True(t, body.IsEnabled)
	require.Equal(t, int32(7), body.SortOrder)

	var storedQuestion string
	var storedOneTime bool
	err := database.Primary().QueryRowContext(
		context.Background(),
		`SELECT question, is_one_time FROM tenant_flow_fields WHERE id = $1 AND tenant_id = $2`,
		body.ID,
		tenantID,
	).Scan(&storedQuestion, &storedOneTime)
	require.NoError(t, err)
	require.Equal(t, "Cual es tu correo?", storedQuestion)
	require.True(t, storedOneTime)
}

func TestHandle_DefaultsOneTimeToFalse(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	database := testutil.NewHarness(t).DB

	tenantID := uuid.New()
	insertTenant(t, database.Primary(), tenantID, "tenant-flow-create-default")

	h := &Handler{DB: database}
	r := gin.New()
	r.Use(middleware.WithErrorHandling())
	r.Use(func(c *gin.Context) {
		c.Set("tenant_id", tenantID)
		c.Next()
	})
	r.POST("/v1/tenants/flow-fields", server.ToGinHandler(h))

	req := httptest.NewRequest(
		http.MethodPost,
		"/v1/tenants/flow-fields",
		strings.NewReader(`{"question":"Cual es tu correo?","isRequired":true,"sortOrder":7}`),
	)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())

	var body Response
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.False(t, body.IsOneTime)
}

func TestFindLatestOneTimeFlowFieldAnswers_ReturnsLatestTenantCustomerAnswers(t *testing.T) {
	t.Parallel()

	database := testutil.NewHarness(t).DB

	tenantID := uuid.New()
	customerID := uuid.New()
	fieldKey := "custom_hair_type"
	insertTenant(t, database.Primary(), tenantID, "tenant-flow-latest-answer")
	insertCustomer(t, database.Primary(), customerID, tenantID, "+573001112233")

	firstAppointmentID := insertAppointment(t, database.Primary(), tenantID, customerID, time.Now().Add(-48*time.Hour))
	secondAppointmentID := insertAppointment(t, database.Primary(), tenantID, customerID, time.Now().Add(-24*time.Hour))
	insertFieldResponse(t, database.Primary(), firstAppointmentID, fieldKey, "Straight", time.Now().Add(-47*time.Hour))
	insertFieldResponse(t, database.Primary(), secondAppointmentID, fieldKey, "Curly", time.Now().Add(-23*time.Hour))

	otherCustomerID := uuid.New()
	insertCustomer(t, database.Primary(), otherCustomerID, tenantID, "+573004445566")
	otherCustomerAppointmentID := insertAppointment(t, database.Primary(), tenantID, otherCustomerID, time.Now().Add(-12*time.Hour))
	insertFieldResponse(t, database.Primary(), otherCustomerAppointmentID, fieldKey, "Wavy", time.Now().Add(-11*time.Hour))

	answers, err := db.Query.FindLatestOneTimeFlowFieldAnswers(context.Background(), database.Primary(), db.FindLatestOneTimeFlowFieldAnswersParams{
		TenantID:   tenantID,
		CustomerID: customerID,
		FieldKeys:  []string{fieldKey},
	})
	require.NoError(t, err)
	require.Len(t, answers, 1)
	require.Equal(t, fieldKey, answers[0].FieldKey)
	require.Equal(t, "Curly", answers[0].Response)
}

func TestHandle_RejectsInvalidCreatePayload(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	h := &Handler{}
	r := gin.New()
	r.Use(middleware.WithErrorHandling())
	r.Use(func(c *gin.Context) {
		c.Set("tenant_id", uuid.New())
		c.Next()
	})
	r.POST("/v1/tenants/flow-fields", server.ToGinHandler(h))

	req := httptest.NewRequest(
		http.MethodPost,
		"/v1/tenants/flow-fields",
		strings.NewReader(`{"question":" ","isRequired":true,"sortOrder":0}`),
	)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusBadRequest, w.Code, w.Body.String())
}

func insertCustomer(t *testing.T, dbtx db.DBTX, id uuid.UUID, tenantID uuid.UUID, phoneNumber string) {
	t.Helper()

	_, err := dbtx.ExecContext(
		context.Background(),
		`INSERT INTO customers (id, tenant_id, phone_number) VALUES ($1, $2, $3)`,
		id,
		tenantID,
		phoneNumber,
	)
	require.NoError(t, err)
}

func insertAppointment(t *testing.T, dbtx db.DBTX, tenantID uuid.UUID, customerID uuid.UUID, startsAt time.Time) uuid.UUID {
	t.Helper()

	resourceID := uuid.New()
	serviceID := uuid.New()
	appointmentID := uuid.New()
	_, err := dbtx.ExecContext(
		context.Background(),
		`INSERT INTO resources (id, tenant_id, name) VALUES ($1, $2, $3)`,
		resourceID,
		tenantID,
		"Resource",
	)
	require.NoError(t, err)

	_, err = dbtx.ExecContext(
		context.Background(),
		`INSERT INTO services (id, tenant_id, name, duration_minutes, price) VALUES ($1, $2, $3, $4, $5)`,
		serviceID,
		tenantID,
		"Service",
		30,
		100,
	)
	require.NoError(t, err)

	_, err = dbtx.ExecContext(
		context.Background(),
		`INSERT INTO appointments (id, tenant_id, resource_id, service_id, customer_id, starts_at, ends_at, price_at_booking) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		appointmentID,
		tenantID,
		resourceID,
		serviceID,
		customerID,
		startsAt,
		startsAt.Add(30*time.Minute),
		100,
	)
	require.NoError(t, err)

	return appointmentID
}

func insertFieldResponse(t *testing.T, dbtx db.DBTX, appointmentID uuid.UUID, fieldKey string, response string, createdAt time.Time) {
	t.Helper()

	_, err := dbtx.ExecContext(
		context.Background(),
		`INSERT INTO appointment_field_responses (id, appointment_id, field_key, response, created_at) VALUES ($1, $2, $3, $4, $5)`,
		uuid.New(),
		appointmentID,
		fieldKey,
		response,
		createdAt,
	)
	require.NoError(t, err)
}

func insertTenant(t *testing.T, dbtx db.DBTX, id uuid.UUID, slug string) {
	t.Helper()

	_, err := dbtx.ExecContext(
		context.Background(),
		`INSERT INTO tenants (id, name, slug, month_reset_at) VALUES ($1, $2, $3, $4)`,
		id,
		"Tenant",
		slug,
		time.Now().Add(30*24*time.Hour),
	)
	require.NoError(t, err)
}
