package customers_get

import (
	"net/http"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Response struct {
	ID               uuid.UUID `json:"id"`
	PhoneNumber      string    `json:"phoneNumber"`
	Name             *string   `json:"name"`
	DisplayName      string    `json:"displayName"`
	IsBlocked        bool      `json:"isBlocked"`
	NoShowCount      int32     `json:"noShowCount"`
	LateCancelCount  int32     `json:"lateCancelCount"`
	AppointmentCount int64     `json:"appointmentCount"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodGet }
func (h *Handler) Path() string   { return "/v1/customers/:id" }

func (h *Handler) Handle(c *gin.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid customer id"),
			fault.Public("Id del cliente inválido"),
		)

	}

	tenantID := jwt.TenantIDFromContext(c)

	customer, err := db.Query.FindCustomerByID(c.Request.Context(), h.DB.Primary(), id)
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("customer not found"),
			fault.Public("El cliente no existe"),
		)

	}
	if customer.TenantID != tenantID {
		return fault.New("customer not found",
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("customer belongs to a different tenant"),
			fault.Public("El cliente no existe"),
		)

	}

	var name *string
	if customer.Name.Valid {
		name = &customer.Name.String
	}
	displayName := customer.PhoneNumber
	if customer.Name.Valid && customer.Name.String != "" {
		displayName = customer.Name.String
	}

	c.JSON(http.StatusOK, Response{
		ID:               customer.ID,
		PhoneNumber:      customer.PhoneNumber,
		Name:             name,
		DisplayName:      displayName,
		IsBlocked:        customer.IsBlocked,
		NoShowCount:      customer.NoShowCount,
		LateCancelCount:  customer.LateCancelCount,
		AppointmentCount: customer.AppointmentCount,
	})
	return nil
}
