package resources_create_override

import (
	"database/sql"
	"net/http"
	"time"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"wappiz/pkg/server"
)

type Request struct {
	Date      string  `json:"date"      binding:"required"`
	IsDayOff  bool    `json:"isDayOff"`
	StartTime *string `json:"startTime"`
	EndTime   *string `json:"endTime"`
	Reason    string  `json:"reason"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodPost }
func (h *Handler) Path() string   { return "/v1/resources/:id/overrides" }

func nullTime(s *string) sql.NullString {
	if s == nil || *s == "" {
		return sql.NullString{}
	}
	t, err := time.Parse("15:04:05", *s)
	if err != nil {
		t, err = time.Parse("15:04", *s)
		if err != nil {
			return sql.NullString{}
		}
	}
	return sql.NullString{String: t.Format("15:04:05"), Valid: true}
}

func (h *Handler) Handle(c *gin.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid resource id"),
			fault.Public("Id del recurso inválido"),
		)

	}
	req, err := server.BindBody[Request](c)
	if err != nil {
		return err
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return fault.Wrap(err,
			fault.Code(codes.ErrorsBadRequest),
			fault.Internal("invalid date format"),
			fault.Public("El campo 'date' debe tener formato YYYY-MM-DD"),
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

	if err := db.Query.InsertScheduleOverride(c.Request.Context(), h.DB.Primary(), db.InsertScheduleOverrideParams{
		ID:         uuid.New(),
		ResourceID: id,
		Date:       date,
		IsDayOff:   req.IsDayOff,
		StartTime:  nullTime(req.StartTime),
		EndTime:    nullTime(req.EndTime),
		Reason:     sql.NullString{String: req.Reason, Valid: req.Reason != ""},
	}); err != nil {
		return fault.Wrap(err, fault.Internal("failed to create schedule override"))

	}

	c.Status(http.StatusCreated)
	return nil
}
