package handlers

import (
	"context"
	"testing"
	"time"

	"wappiz/internal/events"

	"github.com/stretchr/testify/require"
)

func TestBuildAppointmentConfirmedTemplate(t *testing.T) {
	t.Run("fills body params in tenant timezone", func(t *testing.T) {
		loc, err := time.LoadLocation("America/Mexico_City")
		require.NoError(t, err)

		tpl := buildAppointmentConfirmedTemplate(appointmentConfirmedDetails{
			CustomerName: " Ana ",
			BusinessName: "Barber Kings",
			ServiceName:  "Corte clásico",
			ResourceName: "Carlos",
			StartsAt:     time.Date(2026, time.June, 10, 19, 30, 0, 0, time.UTC),
			Location:     loc,
		})

		require.Equal(t, AppointmentConfirmedTemplateName, tpl.Name)
		require.Equal(t, "es", tpl.Language)
		require.Equal(t, []string{
			"Ana",
			"Barber Kings",
			"Corte clásico",
			"Carlos",
			"Miércoles, 10 de Junio de 2026 a las 1:30 PM",
		}, tpl.BodyParams)
	})

	t.Run("never sends an empty customer name", func(t *testing.T) {
		tpl := buildAppointmentConfirmedTemplate(appointmentConfirmedDetails{
			StartsAt: time.Now(),
			Location: time.UTC,
		})

		require.NotEmpty(t, tpl.BodyParams[0])
	})
}

func TestAppointmentCreatedWhatsAppHandlerRetryLimit(t *testing.T) {
	// A malformed payload fails before any dependency is touched.
	h := &AppointmentCreatedWhatsAppHandler{}
	event := func(attempts int) events.Event {
		return events.Event{EventType: events.TypeAppointmentCreated, Payload: []byte("{"), Attempts: attempts}
	}

	t.Run("fails so the event is retried", func(t *testing.T) {
		require.Error(t, h.Handle(context.Background(), event(0)))
		require.Error(t, h.Handle(context.Background(), event(1)))
	})

	t.Run("gives up on the last attempt", func(t *testing.T) {
		require.NoError(t, h.Handle(context.Background(), event(2)))
	})
}
