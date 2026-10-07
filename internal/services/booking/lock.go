package booking

import (
	"context"
	"database/sql"
	"errors"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"

	"github.com/google/uuid"
)

// ErrTargetDeleted is returned by [LockTargets] when the resource or service
// was deleted after the caller validated it, so channels can tell the
// customer the option is gone instead of reporting a generic failure.
var ErrTargetDeleted = errors.New("resource or service was deleted")

// LockTargets share-locks the resource and service an appointment is being
// written for and fails if either was deleted. Call it inside the
// transaction that writes the appointment: deletion locks the same rows
// before counting upcoming appointments, so the two cannot interleave and
// leave an active appointment on a deleted resource or service.
func LockTargets(ctx context.Context, tx db.DBTX, tenantID, resourceID, serviceID uuid.UUID) error {
	if _, err := db.Query.LockLiveResource(ctx, tx, db.LockLiveResourceParams{
		ID:       resourceID,
		TenantID: tenantID,
	}); err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return fault.Wrap(err, fault.Internal("lock resource"))
		}
		return fault.Wrap(ErrTargetDeleted,
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("resource was deleted"),
			fault.Public("El recurso fue eliminado"),
		)
	}

	if _, err := db.Query.LockLiveService(ctx, tx, db.LockLiveServiceParams{
		ID:       serviceID,
		TenantID: tenantID,
	}); err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return fault.Wrap(err, fault.Internal("lock service"))
		}
		return fault.Wrap(ErrTargetDeleted,
			fault.Code(codes.ErrorsNotFound),
			fault.Internal("service was deleted"),
			fault.Public("El servicio fue eliminado"),
		)
	}

	return nil
}
