package routes

import (
	"net/http"
	"time"
	"wappiz/pkg/server"
	"wappiz/svc/api/internal/middleware"
	"wappiz/svc/api/routes/v1/admin_activate_tenant"
	"wappiz/svc/api/routes/v1/admin_find_pending_activations"
	"wappiz/svc/api/routes/v1/admin_reject_tenant"
	"wappiz/svc/api/routes/v1/appointments_create"
	"wappiz/svc/api/routes/v1/appointments_get_status_history"
	"wappiz/svc/api/routes/v1/appointments_reschedule"
	"wappiz/svc/api/routes/v1/appointments_search"
	"wappiz/svc/api/routes/v1/appointments_update_status"
	"wappiz/svc/api/routes/v1/customers_block"
	"wappiz/svc/api/routes/v1/customers_get"
	"wappiz/svc/api/routes/v1/customers_get_incidents"
	"wappiz/svc/api/routes/v1/customers_list"
	"wappiz/svc/api/routes/v1/customers_unblock"
	"wappiz/svc/api/routes/v1/health_liveness"
	"wappiz/svc/api/routes/v1/health_readiness"
	"wappiz/svc/api/routes/v1/onboarding_get_progress"
	"wappiz/svc/api/routes/v1/onboarding_get_templates"
	"wappiz/svc/api/routes/v1/onboarding_step_resource"
	"wappiz/svc/api/routes/v1/onboarding_step_services"
	"wappiz/svc/api/routes/v1/onboarding_step_whatsapp"
	"wappiz/svc/api/routes/v1/plans_get_by_external_id"
	"wappiz/svc/api/routes/v1/plans_list_active"
	"wappiz/svc/api/routes/v1/public_appointments_create"
	"wappiz/svc/api/routes/v1/public_availability_list"
	"wappiz/svc/api/routes/v1/public_tenants_get"
	"wappiz/svc/api/routes/v1/resources_assign_services"
	"wappiz/svc/api/routes/v1/resources_create"
	"wappiz/svc/api/routes/v1/resources_create_override"
	"wappiz/svc/api/routes/v1/resources_delete"
	"wappiz/svc/api/routes/v1/resources_delete_override"
	"wappiz/svc/api/routes/v1/resources_delete_working_hours"
	"wappiz/svc/api/routes/v1/resources_get"
	"wappiz/svc/api/routes/v1/resources_get_services"
	"wappiz/svc/api/routes/v1/resources_list"
	"wappiz/svc/api/routes/v1/resources_list_overrides"
	"wappiz/svc/api/routes/v1/resources_update"
	"wappiz/svc/api/routes/v1/resources_update_sort_order"
	"wappiz/svc/api/routes/v1/resources_upsert_working_hours"
	"wappiz/svc/api/routes/v1/services_create"
	"wappiz/svc/api/routes/v1/services_delete"
	"wappiz/svc/api/routes/v1/services_list"
	"wappiz/svc/api/routes/v1/services_update"
	"wappiz/svc/api/routes/v1/tenant_flow_fields_create"
	"wappiz/svc/api/routes/v1/tenant_flow_fields_list"
	"wappiz/svc/api/routes/v1/tenant_flow_fields_toggle"
	"wappiz/svc/api/routes/v1/tenant_flow_fields_update"
	"wappiz/svc/api/routes/v1/tenants_create"
	"wappiz/svc/api/routes/v1/tenants_get_by_user"
	"wappiz/svc/api/routes/v1/tenants_get_current"
	"wappiz/svc/api/routes/v1/tenants_update"
	"wappiz/svc/api/routes/v1/webhooks_process_webhook"
	"wappiz/svc/api/routes/v1/webhooks_verify_webhook"

	"github.com/gin-gonic/gin"
)

// Register mounts all API route handlers onto the provided Gin engine.
//
// It applies the following middleware layers in order:
//   - CORS (global) — allows all origins; required before route matching so
//     that OPTIONS preflight requests are handled correctly.
//   - JWT auth — all v1 routes require a valid bearer token issued by the
//     auth provider.
//   - Admin role guard — routes under /v1/admin require the JWT claim
//     role="admin"; others receive 403 Forbidden.
//   - WhatsApp signature — webhook processing routes validate the
//     X-Hub-Signature-256 header against [Services.AppSecret].
//   - Public booking — /v1/public routes need no token and are rate limited
//     per client IP instead; booking additionally requires a captcha.
//   - Health — /health/live and /health/ready need no token and are not rate
//     limited, so orchestrators and uptime monitors can probe them freely.
//
// Routes are registered via [RegisterRoute] which reads the method and path
// directly from each handler, keeping routing declarations co-located with
// handler logic.
func Register(g *gin.Engine, svc *Services) {
	// CORS must be global so OPTIONS preflight requests are handled before route matching
	g.Use(server.WithCors())

	rate := server.WithRatelimit(server.RatelimitConfig{
		Service:  svc.Ratelimit,
		Name:     "api-requests-per-user",
		Limit:    100,
		Duration: time.Minute,
		Cost:     1,
	})
	auth := g.Group("/", middleware.WithAuthentication(middleware.AuthConfig{
		Verifier:     svc.JWTVerifier,
		DB:           svc.Database.Primary(),
		TenantFinder: svc.TenantFinder,
	}), rate)

	// ---------------------------------------------------------------------------
	// v1/tenants
	RegisterRoute(auth, &tenants_create.Handler{DB: svc.Database})
	RegisterRoute(auth, &tenants_get_current.Handler{DB: svc.Database})
	RegisterRoute(auth, &tenants_get_by_user.Handler{DB: svc.Database})
	RegisterRoute(auth, &tenants_update.Handler{DB: svc.Database})
	RegisterRoute(auth, &tenant_flow_fields_create.Handler{DB: svc.Database})
	RegisterRoute(auth, &tenant_flow_fields_list.Handler{DB: svc.Database})
	RegisterRoute(auth, &tenant_flow_fields_toggle.Handler{DB: svc.Database})
	RegisterRoute(auth, &tenant_flow_fields_update.Handler{DB: svc.Database})

	// v1/services
	RegisterRoute(auth, &services_create.Handler{DB: svc.Database})
	RegisterRoute(auth, &services_list.Handler{DB: svc.Database})
	RegisterRoute(auth, &services_update.Handler{DB: svc.Database})
	RegisterRoute(auth, &services_delete.Handler{DB: svc.Database})

	// v1/appointments
	RegisterRoute(auth, &appointments_create.Handler{Booking: svc.Booking})
	RegisterRoute(auth, &appointments_search.Handler{DB: svc.Database})
	RegisterRoute(auth, &appointments_get_status_history.Handler{DB: svc.Database})
	RegisterRoute(auth, &appointments_reschedule.Handler{DB: svc.Database, Publisher: svc.Publisher, SlotFinder: svc.SlotFinder})
	RegisterRoute(auth, &appointments_update_status.Handler{DB: svc.Database, Whatsapp: svc.Whatsapp})

	// v1/onboarding
	RegisterRoute(auth, &onboarding_get_progress.Handler{DB: svc.Database})
	RegisterRoute(auth, &onboarding_get_templates.Handler{DB: svc.Database})
	RegisterRoute(auth, &onboarding_step_resource.Handler{DB: svc.Database, Plans: svc.Plans})
	RegisterRoute(auth, &onboarding_step_services.Handler{DB: svc.Database})
	RegisterRoute(auth, &onboarding_step_whatsapp.Handler{DB: svc.Database, Mailer: svc.Mailer, AdminEmail: svc.AdminEmail})

	// v1/customers
	RegisterRoute(auth, &customers_list.Handler{DB: svc.Database})
	RegisterRoute(auth, &customers_get.Handler{DB: svc.Database})
	RegisterRoute(auth, &customers_block.Handler{DB: svc.Database})
	RegisterRoute(auth, &customers_unblock.Handler{DB: svc.Database})
	RegisterRoute(auth, &customers_get_incidents.Handler{DB: svc.Database})

	// v1/resources
	RegisterRoute(auth, &resources_list.Handler{DB: svc.Database})
	RegisterRoute(auth, &resources_get.Handler{DB: svc.Database})
	RegisterRoute(auth, &resources_create.Handler{DB: svc.Database, Plans: svc.Plans})
	RegisterRoute(auth, &resources_update.Handler{DB: svc.Database})
	RegisterRoute(auth, &resources_delete.Handler{DB: svc.Database})
	RegisterRoute(auth, &resources_update_sort_order.Handler{DB: svc.Database})
	RegisterRoute(auth, &resources_upsert_working_hours.Handler{DB: svc.Database})
	RegisterRoute(auth, &resources_delete_working_hours.Handler{DB: svc.Database})
	RegisterRoute(auth, &resources_list_overrides.Handler{DB: svc.Database})
	RegisterRoute(auth, &resources_create_override.Handler{DB: svc.Database, SlotFinder: svc.SlotFinder})
	RegisterRoute(auth, &resources_delete_override.Handler{DB: svc.Database})
	RegisterRoute(auth, &resources_assign_services.Handler{DB: svc.Database})
	RegisterRoute(auth, &resources_get_services.Handler{DB: svc.Database})

	// v1/plans
	RegisterRoute(auth, &plans_list_active.Handler{DB: svc.Database, Environment: svc.Environment})
	RegisterRoute(auth, &plans_get_by_external_id.Handler{DB: svc.Database, Environment: svc.Environment})

	// v1/admin
	admin := auth.Group("/", func(c *gin.Context) {
		if c.GetString("role") != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
		c.Next()
	})

	RegisterRoute(admin, &admin_find_pending_activations.Handler{DB: svc.Database})
	RegisterRoute(admin, &admin_activate_tenant.Handler{
		DB:     svc.Database,
		Mailer: svc.Mailer,
		Crypto: svc.Crypto,
	})
	RegisterRoute(admin, &admin_reject_tenant.Handler{DB: svc.Database, Mailer: svc.Mailer})

	// v1/public — the booking page customers reach from social media links.
	public := g.Group("/", server.WithRatelimit(server.RatelimitConfig{
		Service:    svc.Ratelimit,
		Name:       "public-requests-per-ip",
		Limit:      120,
		Duration:   time.Minute,
		Identifier: server.ClientIPRatelimitIdentifier,
	}))
	RegisterRoute(public, &public_tenants_get.Handler{DB: svc.Database})
	RegisterRoute(public, &public_availability_list.Handler{DB: svc.Database, SlotFinder: svc.SlotFinder})

	// Bookings write data and trigger a WhatsApp message, so they get a much
	// tighter budget on top of the captcha.
	publicBooking := public.Group("/", server.WithRatelimit(server.RatelimitConfig{
		Service:    svc.Ratelimit,
		Name:       "public-bookings-per-ip",
		Limit:      10,
		Duration:   time.Hour,
		Identifier: server.ClientIPRatelimitIdentifier,
	}))
	RegisterRoute(publicBooking, &public_appointments_create.Handler{
		DB:        svc.Database,
		Booking:   svc.Booking,
		Turnstile: svc.Turnstile,
	})

	// health — unauthenticated, unthrottled probes for orchestrators and
	// uptime monitors.
	RegisterRoute(g, &health_liveness.Handler{})
	RegisterRoute(g, &health_readiness.Handler{DB: svc.Database.Primary()})

	// webhooks
	RegisterRoute(g, &webhooks_verify_webhook.Handler{})

	webhook := g.Group("/", middleware.WithWhatsAppSignature(svc.AppSecret))
	RegisterRoute(webhook, &webhooks_process_webhook.Handler{Processor: svc.WebhookProcessor})
}

// RegisterRoute registers a single [Route] on the given router group.
// It delegates to [gin.IRoutes.Handle] using the method and path reported by
// the route itself, so each handler is self-describing and no central routing
// table is needed.
func RegisterRoute(g gin.IRoutes, route server.Route) {
	server.RegisterRoute(g, route)
}
