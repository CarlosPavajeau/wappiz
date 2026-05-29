package statemachine

import (
	"context"
	"wappiz/pkg/db"
	apperrors "wappiz/pkg/errors"

	"github.com/google/uuid"
)

func (s *service) validateService(ctx context.Context, tenantID uuid.UUID, interactiveID *string) (*db.Service, error) {
	if interactiveID == nil {
		return nil, apperrors.ErrInvalidFormat
	}

	serviceID, err := uuid.Parse(*interactiveID)
	if err != nil {
		return nil, apperrors.ErrInvalidFormat
	}

	svc, err := db.Query.FindServiceByID(ctx, s.db.Primary(), serviceID)
	if err != nil {
		return nil, apperrors.ErrNotFound
	}

	if svc.TenantID != tenantID {
		return nil, apperrors.ErrNotFound
	}

	return &svc, nil
}
