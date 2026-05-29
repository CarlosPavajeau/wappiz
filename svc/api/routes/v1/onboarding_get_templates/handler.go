package onboarding_get_templates

import (
	"net/http"
	"wappiz/pkg/db"

	"github.com/gin-gonic/gin"
)

type ServiceTemplate struct {
	Name            string  `json:"name"`
	DurationMinutes int     `json:"duration_minutes"`
	BufferMinutes   int     `json:"buffer_minutes"`
	Price           float64 `json:"price"`
}

var templates = map[string][]ServiceTemplate{
	"basic": {
		{Name: "Corte normal", DurationMinutes: 30, BufferMinutes: 5, Price: 15000},
		{Name: "Corte + barba", DurationMinutes: 45, BufferMinutes: 5, Price: 25000},
	},
	"complete": {
		{Name: "Corte normal", DurationMinutes: 30, BufferMinutes: 5, Price: 15000},
		{Name: "Corte + barba", DurationMinutes: 45, BufferMinutes: 5, Price: 25000},
		{Name: "Lavado", DurationMinutes: 20, BufferMinutes: 5, Price: 10000},
		{Name: "Afeitado", DurationMinutes: 30, BufferMinutes: 5, Price: 20000},
	},
	"manual": {},
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodGet }
func (h *Handler) Path() string   { return "/v1/onboarding/templates" }

func (h *Handler) Handle(c *gin.Context) error {
	c.JSON(http.StatusOK, gin.H{"templates": templates})
	return nil
}
