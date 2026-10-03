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

	loc, err := time.LoadLocation(tenant.Timezone)
	if err != nil {
		return Tenant{}, fault.Wrap(err, fault.Internal("load tenant timezone"))
	}

	return Tenant{Tenant: tenant, Location: loc}, nil
}

func notFound(internal string) error {
	return fault.New("public booking page not found",
		fault.Code(codes.ErrorsNotFound),
		fault.Internal(internal),
		fault.Public("Esta página de reservas no existe"),
	)
}
