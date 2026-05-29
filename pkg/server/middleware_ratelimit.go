package server

import (
	"fmt"
	"time"
	"wappiz/internal/services/ratelimit"
	"wappiz/pkg/codes"
	"wappiz/pkg/fault"
	"wappiz/pkg/logger"

	"github.com/gin-gonic/gin"
)

type RatelimitIdentifierFunc func(c *gin.Context) (string, bool)

type RatelimitConfig struct {
	Service    ratelimit.Service
	Name       string
	Limit      int64
	Duration   time.Duration
	Cost       int64
	Identifier RatelimitIdentifierFunc
}

func UserIDRatelimitIdentifier(c *gin.Context) (string, bool) {
	userID, ok := c.Get("user_id")
	if !ok {
		return "", false
	}

	id, ok := userID.(string)
	if !ok || id == "" {
		return "", false
	}

	return id, true
}

func WithRatelimit(config RatelimitConfig) gin.HandlerFunc {
	identifier := config.Identifier
	if identifier == nil {
		identifier = UserIDRatelimitIdentifier
	}

	cost := config.Cost
	if cost == 0 {
		cost = 1
	}

	return func(c *gin.Context) {
		if config.Service == nil {
			_ = c.Error(fault.New("rate limit service missing",
				fault.Internal("rate limit service is not configured"),
			))
			c.Abort()
			return
		}

		id, ok := identifier(c)
		if !ok {
			_ = c.Error(fault.New("missing rate limit identifier",
				fault.Code(codes.ErrorsUnauthorized),
				fault.Internal("rate limit identifier missing from request context"),
				fault.Public("No estás authorizado. Por favor inicia sesión para continuar."),
			))
			c.Abort()
			return
		}

		resp, err := config.Service.Ratelimit(c.Request.Context(), ratelimit.RatelimitRequest{
			Name:       config.Name,
			Identifier: id,
			Limit:      config.Limit,
			Duration:   config.Duration,
			Cost:       cost,
		})
		if err != nil {
			logger.Warn("[server] rate limit check failed", "error", err)
			_ = c.Error(fault.Wrap(err, fault.Internal("rate limit check failed")))
			c.Abort()
			return
		}

		if !resp.Success {
			c.Header("X-Rate-Limit-Limit", fmt.Sprintf("%d", resp.Limit))
			c.Header("X-Rate-Limit-Reset", fmt.Sprintf("%d", resp.Reset.Unix()))
			_ = c.Error(fault.New("rate limit exceeded",
				fault.Code(codes.ErrorsTooManyRequests),
				fault.Internal("rate limit exceeded"),
				fault.Public("Has excedido el límite de solicitudes. Por favor espera un momento antes de intentar nuevamente."),
			))
			c.Abort()
			return
		}

		c.Next()
	}
}
