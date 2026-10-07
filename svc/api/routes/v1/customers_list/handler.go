package customers_list

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/svc/api/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	defaultLimit = 20
	maxLimit     = 100
	// Match the column sizes: a longer needle can never match.
	maxNameLength  = 255
	maxPhoneDigits = 20
)

type Response struct {
	ID              uuid.UUID `json:"id"`
	PhoneNumber     string    `json:"phoneNumber"`
	Name            *string   `json:"name"`
	DisplayName     string    `json:"displayName"`
	IsBlocked       bool      `json:"isBlocked"`
	NoShowCount     int32     `json:"noShowCount"`
	LateCancelCount int32     `json:"lateCancelCount"`
}

type PageResponse struct {
	Customers []Response `json:"customers"`
	Total     int64      `json:"total"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodGet }
func (h *Handler) Path() string   { return "/v1/customers" }

// query is the parsed filter set. Empty filters are NULL so the SQL skips
// them instead of matching against an empty string.
type query struct {
	name        sql.NullString
	phoneDigits sql.NullString
	isBlocked   sql.NullBool
	page        int32
	limit       int32
}

func toResponse(c db.SearchCustomersRow) Response {
	var name *string
	if c.Name.Valid {
		name = &c.Name.String
	}
	displayName := c.PhoneNumber
	if c.Name.Valid && c.Name.String != "" {
		displayName = c.Name.String
	}
	return Response{
		ID:              c.ID,
		PhoneNumber:     c.PhoneNumber,
		Name:            name,
		DisplayName:     displayName,
		IsBlocked:       c.IsBlocked,
		NoShowCount:     c.NoShowCount,
		LateCancelCount: c.LateCancelCount,
	}
}

func (h *Handler) Handle(c *gin.Context) error {
	q, err := parseQuery(c)
	if err != nil {
		return err
	}

	ctx := c.Request.Context()
	tenantID := middleware.TenantIDFromContext(c)

	customers, err := db.Query.SearchCustomers(ctx, h.DB.Primary(), db.SearchCustomersParams{
		TenantID:    tenantID,
		Name:        q.name,
		PhoneDigits: q.phoneDigits,
		IsBlocked:   q.isBlocked,
		PageOffset:  (q.page - 1) * q.limit,
		PageLimit:   q.limit,
	})
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to fetch customers"))
	}

	total, err := db.Query.CountSearchCustomers(ctx, h.DB.Primary(), db.CountSearchCustomersParams{
		TenantID:    tenantID,
		Name:        q.name,
		PhoneDigits: q.phoneDigits,
		IsBlocked:   q.isBlocked,
	})
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to count customers"))
	}

	result := make([]Response, len(customers))
	for i, cu := range customers {
		result[i] = toResponse(cu)
	}

	c.JSON(http.StatusOK, PageResponse{Customers: result, Total: total})
	return nil
}

func parseQuery(c *gin.Context) (query, error) {
	q := query{page: 1, limit: defaultLimit}

	if raw := c.Query("page"); raw != "" {
		page, err := strconv.ParseInt(raw, 10, 32)
		if err != nil || page < 1 {
			return query{}, badRequest("invalid page", "La página debe ser un número mayor o igual a 1")
		}
		q.page = int32(page)
	}

	if raw := c.Query("limit"); raw != "" {
		limit, err := strconv.ParseInt(raw, 10, 32)
		if err != nil || limit < 1 || limit > maxLimit {
			return query{}, badRequest("invalid limit", "El límite debe estar entre 1 y 100")
		}
		q.limit = int32(limit)
	}

	// Guards the offset computation against int32 overflow on absurd pages.
	if int64(q.page-1)*int64(q.limit) > int64(^uint32(0)>>1) {
		return query{}, badRequest("page out of range", "La página está fuera de rango")
	}

	if name := strings.TrimSpace(c.Query("name")); name != "" {
		if utf8.RuneCountInString(name) > maxNameLength {
			return query{}, badRequest("name too long", "El nombre es demasiado largo")
		}
		q.name = sql.NullString{String: name, Valid: true}
	}

	if raw := strings.TrimSpace(c.Query("phone")); raw != "" {
		digits := strings.Map(func(r rune) rune {
			if r >= '0' && r <= '9' {
				return r
			}
			return -1
		}, raw)
		if digits == "" || len(digits) > maxPhoneDigits {
			return query{}, badRequest("invalid phone", "El teléfono debe contener entre 1 y 20 dígitos")
		}
		q.phoneDigits = sql.NullString{String: digits, Valid: true}
	}

	switch c.Query("status") {
	case "":
	case "active":
		q.isBlocked = sql.NullBool{Bool: false, Valid: true}
	case "blocked":
		q.isBlocked = sql.NullBool{Bool: true, Valid: true}
	default:
		return query{}, badRequest("invalid status", "El estado debe ser 'active' o 'blocked'")
	}

	return q, nil
}

func badRequest(internal, public string) error {
	return fault.New(internal,
		fault.Code(codes.ErrorsBadRequest),
		fault.Internal(internal),
		fault.Public(public),
	)
}
