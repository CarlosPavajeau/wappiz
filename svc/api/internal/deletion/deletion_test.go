package deletion

import (
	"testing"
	"wappiz/pkg/codes"
	"wappiz/pkg/fault"

	"github.com/stretchr/testify/require"
)

func TestUpcomingAppointmentsError(t *testing.T) {
	t.Run("singular", func(t *testing.T) {
		err := UpcomingAppointmentsError(EntityService, 1)

		code, ok := fault.GetCode(err)
		require.True(t, ok)
		require.Equal(t, codes.AppErrorsHasUpcomingAppointments, code)
		require.Equal(t,
			"Este servicio tiene 1 cita programada. Cancélala o espera a que termine antes de eliminarlo.",
			fault.UserFacingMessage(err))
	})

	t.Run("plural", func(t *testing.T) {
		require.Equal(t,
			"Este recurso tiene 3 citas programadas. Cancélalas o espera a que terminen antes de eliminarlo.",
			fault.UserFacingMessage(UpcomingAppointmentsError(EntityResource, 3)))
	})
}
