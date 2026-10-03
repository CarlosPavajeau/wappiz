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

func TestRequestEnablesPublicBooking(t *testing.T) {
	cases := []struct {
		name    string
		body    string
		current bool
		want    bool
	}{
		{name: "turning it on", body: `{"publicBookingEnabled": true}`, current: false, want: true},
		{name: "already on", body: `{"publicBookingEnabled": true}`, current: true, want: false},
		{name: "turning it off", body: `{"publicBookingEnabled": false}`, current: true, want: false},
		{name: "omitted", body: `{"botName": "Asistente"}`, current: false, want: false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var req Request
			require.NoError(t, json.Unmarshal([]byte(tc.body), &req))

			got := req.enablesPublicBooking(db.TenantSettings{PublicBookingEnabled: tc.current})

			require.Equal(t, tc.want, got)
		})
	}
}
