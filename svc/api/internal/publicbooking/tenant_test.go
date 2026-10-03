package publicbooking

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestBookingWindowEnd(t *testing.T) {
	loc, err := time.LoadLocation("America/Bogota")
	require.NoError(t, err)

	t.Run("ends at local midnight after the last bookable day", func(t *testing.T) {
		now := time.Date(2026, time.October, 3, 10, 0, 0, 0, loc)
		want := time.Date(2026, time.December, 3, 0, 0, 0, 0, loc)
		require.True(t, BookingWindowEnd(now, loc).Equal(want))
	})

	t.Run("follows the tenant calendar, not UTC", func(t *testing.T) {
		// 23:30 in Bogotá is already October 4 in UTC.
		now := time.Date(2026, time.October, 3, 23, 30, 0, 0, loc).UTC()
		want := time.Date(2026, time.December, 3, 0, 0, 0, 0, loc)
		require.True(t, BookingWindowEnd(now, loc).Equal(want))
	})
}
