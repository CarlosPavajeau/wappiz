package tenants_update

import (
	"encoding/json"
	"testing"
	"wappiz/pkg/db"

	"github.com/stretchr/testify/require"
)

func TestRequestApplyTo(t *testing.T) {
	stored := db.TenantSettings{
		BotName:         "Asistente",
		OwnerPhone:      "573001234567",
		LateCancelHours: 2,
	}

	t.Run("keeps fields the request omits", func(t *testing.T) {
		var req Request
		require.NoError(t, json.Unmarshal([]byte(`{"publicBookingEnabled": true}`), &req))

		got := req.applyTo(stored)

		require.True(t, got.PublicBookingEnabled)
		require.Equal(t, "573001234567", got.OwnerPhone)
		require.Equal(t, "Asistente", got.BotName)
		require.Equal(t, 2, got.LateCancelHours)
	})

	t.Run("overwrites present fields, including zero values", func(t *testing.T) {
		var req Request
		require.NoError(t, json.Unmarshal([]byte(`{"botName": "", "lateCancelHours": 0}`), &req))

		got := req.applyTo(stored)

		require.Equal(t, "", got.BotName)
		require.Equal(t, 0, got.LateCancelHours)
		require.Equal(t, "573001234567", got.OwnerPhone)
	})
}
