package tenants_create

import (
	"context"
	"fmt"
	"math/rand"
	"net/http"
	"regexp"
	"strings"
	"time"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/server"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

var predefinedFields = []struct {
	FieldKey  string
	SortOrder int32
}{
	{FieldKey: "document_id", SortOrder: 1},
	{FieldKey: "visit_reason", SortOrder: 2},
	{FieldKey: "email", SortOrder: 3},
	{FieldKey: "address", SortOrder: 4},
	{FieldKey: "birth_date", SortOrder: 5},
}

type Request struct {
	Name string `json:"name" binding:"required"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodPost }
func (h *Handler) Path() string   { return "/v1/tenants" }

func (h *Handler) Handle(c *gin.Context) error {
	req, err := server.BindBody[Request](c)
	if err != nil {
		return err
	}

	userID := c.MustGet("user_id").(string)
	base := slugify(req.Name)

	tenantID, err := db.TxWithResult(c.Request.Context(), h.DB.Primary(), func(ctx context.Context, txx db.DBTX) (uuid.UUID, error) {
		var err error
		tenantID := uuid.New()

		for attempt := range slugMaxRetries {
			slug := base
			if attempt > 0 {
				slug = fmt.Sprintf("%s-%s", base, randomSuffix(5))
			}

			err = db.Query.InsertTenant(ctx, txx, db.InsertTenantParams{
				ID:           tenantID,
				Name:         req.Name,
				Slug:         slug,
				Timezone:     "America/Bogota",
				Currency:     "COP",
				MonthResetAt: time.Time{},
				Settings:     nil,
			})

			if err == nil {
				break
			}
		}

		if err != nil {
			return uuid.Nil, err
		}

		if err := db.Query.LinkTenantUser(ctx, txx, db.LinkTenantUserParams{
			TenantID: tenantID,
			UserID:   userID,
		}); err != nil {
			return uuid.Nil, err
		}

		if err := db.Query.InsertOnboardingProgress(ctx, txx, db.InsertOnboardingProgressParams{
			ID:          uuid.New(),
			TenantID:    tenantID,
			CurrentStep: int32(2),
		}); err != nil {
			return uuid.Nil, err
		}

		fieldKeys, sortOrders := predefinedFieldParams()
		if err := db.Query.CreateTenantPredefinedFlowFields(ctx, txx, db.CreateTenantPredefinedFlowFieldsParams{
			TenantID:   tenantID,
			FieldKeys:  fieldKeys,
			SortOrders: sortOrders,
		}); err != nil {
			return uuid.Nil, err
		}

		return tenantID, nil
	})

	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to create tenant"))
	}

	c.JSON(http.StatusCreated, gin.H{"tenant_id": tenantID.String()})
	return nil
}

const slugAlphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
const slugMaxRetries = 5

var nonAlphanumeric = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = nonAlphanumeric.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

func randomSuffix(n int) string {
	b := make([]byte, n)
	for i := range b {
		b[i] = slugAlphabet[rand.Intn(len(slugAlphabet))]
	}
	return string(b)
}

func predefinedFieldParams() ([]string, []int32) {
	fieldKeys := make([]string, len(predefinedFields))
	sortOrders := make([]int32, len(predefinedFields))

	for i, f := range predefinedFields {
		fieldKeys[i] = f.FieldKey
		sortOrders[i] = f.SortOrder
	}

	return fieldKeys, sortOrders
}
