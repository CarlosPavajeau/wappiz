package resources_get

import (
	"net/http"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

var dayNames = [7]string{"Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"}

type WorkingHoursResponse struct {
	ID        uuid.UUID `json:"id"`
	DayOfWeek int16     `json:"dayOfWeek"`
	DayName   string    `json:"dayName"`
	StartTime string    `json:"startTime"`
	EndTime   string    `json:"endTime"`
	IsActive  bool      `json:"isActive"`
}

type Response struct {
	ID           uuid.UUID              `json:"id"`
	Name         string                 `json:"name"`
	Type         string                 `json:"type"`
	AvatarURL    string                 `json:"avatarUrl"`
	SortOrder    int32                  `json:"sortOrder"`
	IsActive     bool                   `json:"isActive"`
	WorkingHours []WorkingHoursResponse `json:"workingHours"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodGet }
func (h *Handler) Path() string   { return "/v1/resources/:id" }

func (h *Handler) Handle(c *gin.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid resource id"),
			fault.Public("Id del recurso inválido"),
		)

	}

	tenantID := jwt.TenantIDFromContext(c)

	r, err := db.Query.FindResourceById(c.Request.Context(), h.DB.Primary(), id)
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("resource not found"),
			fault.Public("El recurso no existe"),
		)

	}
	if r.TenantID != tenantID {
		return fault.New("resource not found",
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("resource belongs to a different tenant"),
			fault.Public("El recurso no existe"),
		)

	}

	whs, err := db.Query.FindResourceWorkingHours(c.Request.Context(), h.DB.Primary(), id)
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to fetch working hours"))

	}

	whResponse := make([]WorkingHoursResponse, len(whs))
	for i, wh := range whs {
		whResponse[i] = WorkingHoursResponse{
			ID:        wh.ID,
			DayOfWeek: wh.DayOfWeek,
			DayName:   dayNames[wh.DayOfWeek],
			StartTime: wh.StartTime,
			EndTime:   wh.EndTime,
			IsActive:  wh.IsActive,
		}
	}

	c.JSON(http.StatusOK, Response{
		ID:           r.ID,
		Name:         r.Name,
		Type:         r.Type,
		AvatarURL:    r.AvatarUrl,
		SortOrder:    r.SortOrder,
		IsActive:     r.IsActive,
		WorkingHours: whResponse,
	})
	return nil
}
