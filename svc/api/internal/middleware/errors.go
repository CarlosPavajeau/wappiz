package middleware

import (
	"net/http"
	"wappiz/pkg/codes"
	"wappiz/pkg/fault"
	"wappiz/svc/api/openapi"

	"github.com/gin-gonic/gin"
)

// WithErrorHandling returns middleware that translates errors into appropriate
func WithErrorHandling() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) == 0 {
			return
		}

		if c.Writer.Written() {
			return
		}

		err := c.Errors.Last().Err
		urn, ok := fault.GetCode(err)

		if !ok {
			urn = "unknown"
		}

		meta := openapi.Meta{RequestId: c.GetString("request_id")}
		detail := fault.UserFacingMessage(err)
		t := string(urn)

		switch urn {
		case codes.ErrorsNotFound:
			c.AbortWithStatusJSON(http.StatusNotFound, openapi.NotFoundErrorResponse{
				Meta:  meta,
				Error: openapi.BaseError{Title: "Not Found", Type: t, Detail: detail, Status: http.StatusNotFound},
			})

		case codes.ErrorsUnauthorized:
			c.AbortWithStatusJSON(http.StatusUnauthorized, openapi.UnauthorizedErrorResponse{
				Meta:  meta,
				Error: openapi.BaseError{Title: "Unauthorized", Type: t, Detail: detail, Status: http.StatusUnauthorized},
			})

		case codes.ErrorsForbidden,
			codes.ErrorsForbiddenResourceQuotaExceeded,
			codes.AppErrorsClientBlocked,
			codes.AppErrorsPlanLimitReached:
			c.AbortWithStatusJSON(http.StatusForbidden, openapi.ForbiddenErrorResponse{
				Meta:  meta,
				Error: openapi.BaseError{Title: "Forbidden", Type: t, Detail: detail, Status: http.StatusForbidden},
			})

		case codes.ErrorsConflict,
			codes.AppErrorsAppointmentOverlap:
			c.AbortWithStatusJSON(http.StatusConflict, openapi.ConflictErrorResponse{
				Meta:  meta,
				Error: openapi.BaseError{Title: "Conflict", Type: t, Detail: detail, Status: http.StatusConflict},
			})

		case codes.ErrorsTooManyRequests:
			c.AbortWithStatusJSON(http.StatusTooManyRequests, openapi.TooManyRequestsErrorResponse{
				Meta:  meta,
				Error: openapi.BaseError{Title: "Too Many Requests", Type: t, Detail: detail, Status: http.StatusTooManyRequests},
			})

		case codes.ErrorsBadRequest,
			codes.AppErrorsDateInPast:
			c.AbortWithStatusJSON(http.StatusBadRequest, openapi.BadRequestErrorResponse{
				Meta:  meta,
				Error: openapi.BaseError{Title: "Bad Request", Type: t, Detail: detail, Status: http.StatusBadRequest},
			})

		default:
			c.AbortWithStatusJSON(http.StatusInternalServerError, openapi.InternalServerErrorResponse{
				Meta:  meta,
				Error: openapi.BaseError{Title: "Internal Server Error", Type: t, Detail: detail, Status: http.StatusInternalServerError},
			})
		}
	}
}
