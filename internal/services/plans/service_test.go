package plans

import (
	"context"
	"testing"
	"wappiz/internal/services/featureflags"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestService_BillingFlagOff(t *testing.T) {
	// A nil database proves the flag short-circuits before any plan lookup.
	// Limits with the flag on need Postgres, whose harness is internal to
	// svc/api: they are covered by the resources_create, onboarding and
	// public booking integration tests.
	svc := New(Config{Flags: featureflags.Static()})
	ctx := context.Background()

	t.Run("resources are unlimited", func(t *testing.T) {
		require.NoError(t, svc.EnsureCanCreateResource(ctx, nil, uuid.New()))
	})

	t.Run("appointments are unlimited", func(t *testing.T) {
		limit, err := svc.AppointmentLimit(ctx, uuid.New())
		require.NoError(t, err)
		require.False(t, limit.Valid)
	})
}

func TestAppointmentLimitFromInt(t *testing.T) {
	t.Run("in range", func(t *testing.T) {
		limit, err := appointmentLimitFromInt(30)
		require.NoError(t, err)
		require.True(t, limit.Valid)
		require.Equal(t, int32(30), limit.Int32)
	})

	t.Run("negative", func(t *testing.T) {
		_, err := appointmentLimitFromInt(-1)
		require.Error(t, err)
	})
}
