package handlers

import (
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestBuildAppointmentCanceledEmailIncludesAppointmentDetails(t *testing.T) {
	body := buildAppointmentCanceledEmail(appointmentCanceledEmailDetails{
		CustomerName:    "Ana Gomez",
		CustomerPhone:   "+573001234567",
		ServiceName:     "Corte clasico",
		ResourceName:    "Carlos",
		DurationMinutes: 45,
		Price:           "35000.00",
		StartsAt:        time.Date(2026, time.June, 10, 19, 30, 0, 0, time.UTC),
		EndsAt:          time.Date(2026, time.June, 10, 20, 15, 0, 0, time.UTC),
	})

	for _, expected := range []string{
		"Cita cancelada",
		"Ana Gomez",
		"+573001234567",
		"Corte clasico",
		"Carlos",
		"10/06/2026",
		"14:30 - 15:15",
		"45 minutos",
		"$35000.00",
		"La cita fue cancelada por el cliente desde WhatsApp.",
	} {
		require.Contains(t, body, expected)
	}
}

func TestBuildAppointmentCanceledEmailEscapesDynamicContent(t *testing.T) {
	body := buildAppointmentCanceledEmail(appointmentCanceledEmailDetails{
		CustomerName:  `<script>alert("x")</script>`,
		CustomerPhone: `<phone>`,
		ServiceName:   `<service>`,
		ResourceName:  `<resource>`,
		Price:         `<price>`,
		StartsAt:      time.Now(),
		EndsAt:        time.Now(),
	})

	require.NotContains(t, body, "<script>")
	require.NotContains(t, body, "<phone>")
	require.NotContains(t, body, "<service>")
	require.NotContains(t, body, "<resource>")
	require.NotContains(t, body, "<price>")
	require.True(t, strings.Contains(body, "&lt;script&gt;"))
}
