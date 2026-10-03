package public_tenants_get

import (
	"testing"
	"wappiz/pkg/db"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestGroupResources(t *testing.T) {
	t.Run("folds rows into resources keeping order", func(t *testing.T) {
		ana, luis := uuid.New(), uuid.New()
		cut, beard := uuid.New(), uuid.New()

		got := groupResources([]db.FindBookableResourceServicesByTenantRow{
			{ResourceID: luis, ResourceName: "Luis", ServiceID: cut},
			{ResourceID: ana, ResourceName: "Ana", ServiceID: cut},
			{ResourceID: luis, ResourceName: "Luis", ServiceID: beard},
		})

		require.Equal(t, []ResourceResponse{
			{ID: luis, Name: "Luis", ServiceIDs: []uuid.UUID{cut, beard}},
			{ID: ana, Name: "Ana", ServiceIDs: []uuid.UUID{cut}},
		}, got)
	})

	t.Run("encodes no resources as an empty list", func(t *testing.T) {
		require.NotNil(t, groupResources(nil))
	})
}
