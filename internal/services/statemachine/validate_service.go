package statemachine

import (
	"context"
	"wappiz/pkg/codes"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"

	"github.com/google/uuid"
)

func (s *service) validateService(ctx context.Context, tenantID uuid.UUID, interactiveID *string) (*db.Service, error) {
	if interactiveID == nil {
		return nil, fault.New("missing service selection", fault.Code(codes.AppErrorsInvalidFormat))
	}

	serviceID, err := uuid.Parse(*interactiveID)
	if err != nil {
		return nil, fault.Wrap(err,
			fault.Code(codes.AppErrorsInvalidFormat),
			fault.Internal("invalid service selection"),
		)
	}

	svc, err := db.Query.FindServiceByID(ctx, s.db.Primary(), serviceID)
	if err != nil {
		return nil, fault.Wrap(err,
			fault.Code(codes.AppErrorsNotFound),
			fault.Internal("service not found"),
		)
	}

	if svc.TenantID != tenantID {
		return nil, fault.New("service not found", fault.Code(codes.AppErrorsNotFound))
	}

	return &svc, nil
}
