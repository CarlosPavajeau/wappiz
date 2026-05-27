package tenant_flow_fields_update

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"wappiz/pkg/db"
	"wappiz/svc/api/internal/middleware"
	"wappiz/svc/api/internal/testutil"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestHandle_UpdatesTenantOwnedFlowField(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	database := testutil.NewHarness(t).DB

	tenantID := uuid.New()
	fieldID := uuid.New()
	insertTenant(t, database.Primary(), tenantID, "tenant-flow-update")
	insertFlowField(t, database.Primary(), fieldID, tenantID, "email")

	h := &Handler{DB: database}
	r := gin.New()
	r.Use(middleware.WithErrorHandling())
	r.Use(func(c *gin.Context) {
		c.Set("tenant_id", tenantID)
		c.Next()
	})
	r.PUT("/v1/tenants/flow-fields/:id", h.Handle)

	req := httptest.NewRequest(
		http.MethodPut,
		"/v1/tenants/flow-fields/"+fieldID.String(),
		strings.NewReader(`{"question":"  Cual es tu email?  ","isRequired":true,"sortOrder":9}`),
	)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusNoContent, w.Code, w.Body.String())

	var question string
	var required bool
	var sortOrder int32
	err := database.Primary().QueryRowContext(
		context.Background(),
		`SELECT question, is_required, sort_order FROM tenant_flow_fields WHERE id = $1`,
		fieldID,
	).Scan(&question, &required, &sortOrder)
	require.NoError(t, err)
	require.Equal(t, "Cual es tu email?", question)
	require.True(t, required)
	require.Equal(t, int32(9), sortOrder)
}

func TestHandle_ReturnsNotFoundForOtherTenantFlowField(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	database := testutil.NewHarness(t).DB

	tenantID := uuid.New()
	otherTenantID := uuid.New()
	fieldID := uuid.New()
	insertTenant(t, database.Primary(), tenantID, "tenant-flow-update-owner")
	insertTenant(t, database.Primary(), otherTenantID, "tenant-flow-update-other")
	insertFlowField(t, database.Primary(), fieldID, otherTenantID, "document_id")

	h := &Handler{DB: database}
	r := gin.New()
	r.Use(middleware.WithErrorHandling())
	r.Use(func(c *gin.Context) {
		c.Set("tenant_id", tenantID)
		c.Next()
	})
	r.PUT("/v1/tenants/flow-fields/:id", h.Handle)

	req := httptest.NewRequest(
		http.MethodPut,
		"/v1/tenants/flow-fields/"+fieldID.String(),
		strings.NewReader(`{"question":"No debe cambiar","isRequired":true,"sortOrder":9}`),
	)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusNotFound, w.Code, w.Body.String())

	var question string
	var required bool
	var sortOrder int32
	err := database.Primary().QueryRowContext(
		context.Background(),
		`SELECT question, is_required, sort_order FROM tenant_flow_fields WHERE id = $1`,
		fieldID,
	).Scan(&question, &required, &sortOrder)
	require.NoError(t, err)
	require.Equal(t, "Original", question)
	require.False(t, required)
	require.Equal(t, int32(1), sortOrder)
}

func TestHandle_ReturnsNotFoundForMissingFlowField(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	database := testutil.NewHarness(t).DB

	tenantID := uuid.New()
	insertTenant(t, database.Primary(), tenantID, "tenant-flow-update-missing")

	h := &Handler{DB: database}
	r := gin.New()
	r.Use(middleware.WithErrorHandling())
	r.Use(func(c *gin.Context) {
		c.Set("tenant_id", tenantID)
		c.Next()
	})
	r.PUT("/v1/tenants/flow-fields/:id", h.Handle)

	req := httptest.NewRequest(
		http.MethodPut,
		"/v1/tenants/flow-fields/"+uuid.New().String(),
		strings.NewReader(`{"question":"No debe existir","isRequired":true,"sortOrder":9}`),
	)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusNotFound, w.Code, w.Body.String())
}

func TestHandle_RejectsInvalidUpdateID(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	h := &Handler{}
	r := gin.New()
	r.Use(middleware.WithErrorHandling())
	r.PUT("/v1/tenants/flow-fields/:id", h.Handle)

	req := httptest.NewRequest(
		http.MethodPut,
		"/v1/tenants/flow-fields/not-a-uuid",
		strings.NewReader(`{"question":"Pregunta","isRequired":true,"sortOrder":0}`),
	)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusBadRequest, w.Code, w.Body.String())
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

func insertFlowField(t *testing.T, dbtx db.DBTX, id uuid.UUID, tenantID uuid.UUID, key string) {
	t.Helper()

	_, err := dbtx.ExecContext(
		context.Background(),
		`INSERT INTO tenant_flow_fields (
			id,
			tenant_id,
			field_key,
			field_type,
			question,
			is_required,
			is_enabled,
			sort_order
		) VALUES ($1, $2, $3, 'predefined', 'Original', false, true, 1)`,
		id,
		tenantID,
		key,
	)
	require.NoError(t, err)
}
