package tenants_create

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"wappiz/pkg/server"
	"wappiz/svc/api/internal/testutil"

	"github.com/gin-gonic/gin"
)

func TestHandle_CreatesTenant_ReturnsCreated(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	database := testutil.NewHarness(t).DB

	userID := "user-int-200"
	testutil.InsertUser(t, database, userID, "Integration User", "user-int-200@example.com")

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

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d, body=%s", http.StatusCreated, w.Code, w.Body.String())
	}

	var body struct {
		Tenant string `json:"tenant_id"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse JSON body: %v", err)
	}
	if len(body.Tenant) == 0 {
		t.Fatal("expected non-empty tenant_id in response")
	}

	var tenantCount int
	if err := database.Primary().QueryRowContext(
		context.Background(),
		`SELECT COUNT(*) FROM tenants WHERE name = $1`,
		"Barber Hub",
	).Scan(&tenantCount); err != nil {
		t.Fatalf("failed to query tenants: %v", err)
	}
	if tenantCount != 1 {
		t.Fatalf("expected 1 created tenant, got %d", tenantCount)
	}

	var onboardingCount int
	if err := database.Primary().QueryRowContext(
		context.Background(),
		`SELECT COUNT(*) FROM onboarding_progress`,
	).Scan(&onboardingCount); err != nil {
		t.Fatalf("failed to query onboarding progress: %v", err)
	}
	if onboardingCount != 1 {
		t.Fatalf("expected 1 onboarding progress row, got %d", onboardingCount)
	}
}
