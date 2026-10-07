/**
 * Error codes the API returns in `error.type` that clients branch on.
 * They mirror `pkg/codes` in the Go backend.
 */
export const ERROR_CODES = {
  hasUpcomingAppointments: "err:application:has_upcoming_appointments",
} as const
