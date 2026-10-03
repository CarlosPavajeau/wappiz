// Package publicbooking holds the pieces shared by the unauthenticated
// public booking routes (/v1/public/tenants/:slug/...).
package publicbooking

import (
	"context"
	"database/sql"
	"errors"
	"time"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"

	"github.com/google/uuid"
)

// BookingWindowDays is how many days ahead customers can book from the
// public page. It bounds the work a single anonymous caller can request.
const BookingWindowDays = 60

// Tenant is a tenant whose public booking page is enabled, with its
// timezone already resolved.
type Tenant struct {
	db.Tenant
	Location *time.Location
}

// FindTenant resolves slug to a tenant that accepts public bookings. Unknown,
// inactive and opted-out tenants are indistinguishable to the caller so the
// endpoint cannot be used to enumerate tenants.
func FindTenant(ctx context.Context, database db.Database, slug string) (Tenant, error) {
	tenant, err := db.Query.FindTenantBySlug(ctx, database.Primary(), slug)
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return Tenant{}, fault.Wrap(err, fault.Internal("find tenant by slug"))
		}
		return Tenant{}, notFound("tenant not found")
	}

	settings, err := db.UnmarshalNullableJSONTo[db.TenantSettings](tenant.Settings)
	if err != nil {
		return Tenant{}, fault.Wrap(err, fault.Internal("unmarshal tenant settings"))
	}
	if !settings.PublicBookingEnabled {
		return Tenant{}, notFound("public booking disabled")
	}
	// The booking confirmation is only delivered over WhatsApp, so the page
	// must not take bookings it cannot confirm.
	canSend, err := CanSendWhatsapp(ctx, database, tenant.ID)
	if err != nil {
		return Tenant{}, err
	}
	if !canSend {
		return Tenant{}, notFound("whatsapp messaging not ready")
	}

	loc, err := time.LoadLocation(tenant.Timezone)
	if err != nil {
		return Tenant{}, fault.Wrap(err, fault.Internal("load tenant timezone"))
	}

	return Tenant{Tenant: tenant, Location: loc}, nil
}

// CanSendWhatsapp reports whether the tenant can deliver the WhatsApp
// confirmation that every public booking promises.
func CanSendWhatsapp(ctx context.Context, database db.Database, tenantID uuid.UUID) (bool, error) {
	waConfig, err := db.Query.FindTenantWhatsappConfig(ctx, database.Primary(), tenantID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, fault.Wrap(err, fault.Internal("find tenant whatsapp config"))
	}
	return waConfig.CanSend(), nil
}

func notFound(internal string) error {
	return fault.New("public booking page not found",
		fault.Code(codes.ErrorsNotFound),
		fault.Internal(internal),
		fault.Public("Esta página de reservas no existe"),
	)
}
