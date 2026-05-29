package plans_get_by_external_id

import (
	"net/http"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Response struct {
	ID          uuid.UUID `json:"id"`
	ExternalID  string    `json:"externalId"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Price       int32     `json:"price"`
	Currency    string    `json:"currency"`
	Interval    string    `json:"interval"`
}

type Handler struct {
	DB          db.Database
	Environment string
}

func (h *Handler) Method() string { return http.MethodGet }
func (h *Handler) Path() string   { return "/v1/plans/by-external-id/:externalId" }

func (h *Handler) Handle(c *gin.Context) error {
	plan, err := db.Query.FindPlanByExternalId(c.Request.Context(), h.DB.Primary(), db.FindPlanByExternalIdParams{
		ExternalID:  c.Param("externalId"),
		Environment: h.Environment,
	})
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("plan not found by external id"),
			fault.Public("El plan no existe"),
		)

	}

	c.JSON(http.StatusOK, Response{
		ID:          plan.ID,
		ExternalID:  plan.ExternalID,
		Name:        plan.Name,
		Description: plan.Description.String,
		Price:       plan.Price,
		Currency:    plan.Currency,
		Interval:    plan.Interval.String,
	})
	return nil
}
