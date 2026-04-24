import { createFileRoute } from "@tanstack/react-router"

import { AppointmentsCalendar } from "@/components/appointments/calendar"

export const Route = createFileRoute(
  "/_authed/dashboard/experimental/calendar"
)({
  component: CalendarPage,
})

function CalendarPage() {
  return <AppointmentsCalendar />
}
