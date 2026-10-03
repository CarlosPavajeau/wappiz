package tenants_create

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"wappiz/pkg/server"
	"wappiz/svc/api/internal/testutil"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestHandle_SlugTaken_RetriesWithSuffix(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	database := testutil.NewHarness(t).DB

	_, err := database.Primary().ExecContext(context.Background(),
		`INSERT INTO tenants (id, name, slug, month_reset_at) VALUES ($1, 'Barber Hub', 'barber-hub', $2)`,
		uuid.New(), time.Now())
	require.NoError(t, err)

	userID := "user-slug-taken"
	testutil.InsertUser(t, database, userID, "Slug User", "user-slug-taken@example.com")

	h := &Handler{DB: database}
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("user_id", userID)
		c.Next()
	})
	r.POST("/v1/tenants", server.ToGinHandler(h))

	req := httptest.NewRequest(http.MethodPost, "/v1/tenants", strings.NewReader(`{"name":"Barber Hub"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())

	var slug string
	require.NoError(t, database.Primary().QueryRowContext(context.Background(),
		`SELECT t.slug FROM tenants t JOIN tenant_users tu ON tu.tenant_id = t.id WHERE tu.user_id = $1`,
		userID).Scan(&slug))
	require.True(t, strings.HasPrefix(slug, "barber-hub-"), slug)
}
