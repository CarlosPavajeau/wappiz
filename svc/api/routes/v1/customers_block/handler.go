package customers_block

import (
	"net/http"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodPost }
func (h *Handler) Path() string   { return "/v1/customers/:id/block" }

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

	if err := db.Query.BlockCustomer(c.Request.Context(), h.DB.Primary(), db.BlockCustomerParams{
		ID:       id,
		TenantID: tenantID,
	}); err != nil {
		return fault.Wrap(err, fault.Internal("failed to block customer"))

	}

	c.JSON(http.StatusOK, gin.H{"message": "customer blocked"})
	return nil
}
