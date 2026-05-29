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
		strings.NewReader(`{"question":"  Cual es tu correo?  ","isRequired":true,"sortOrder":7}`),
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
	require.True(t, body.IsEnabled)
	require.Equal(t, int32(7), body.SortOrder)

	var storedQuestion string
	err := database.Primary().QueryRowContext(
		context.Background(),
		`SELECT question FROM tenant_flow_fields WHERE id = $1 AND tenant_id = $2`,
		body.ID,
		tenantID,
	).Scan(&storedQuestion)
	require.NoError(t, err)
	require.Equal(t, "Cual es tu correo?", storedQuestion)
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
