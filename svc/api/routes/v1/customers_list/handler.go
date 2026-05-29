package customers_list

import (
	"net/http"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodGet }
func (h *Handler) Path() string   { return "/v1/customers" }

func toResponse(c db.FindCustomersByTenantRow) Response {
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
	tenantID := jwt.TenantIDFromContext(c)

	customers, err := db.Query.FindCustomersByTenant(c.Request.Context(), h.DB.Primary(), tenantID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to fetch customers"))

	}

	result := make([]Response, len(customers))
	for i, cu := range customers {
		result[i] = toResponse(cu)
	}

	c.JSON(http.StatusOK, result)
	return nil
}
