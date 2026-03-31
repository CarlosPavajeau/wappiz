import { createFileRoute, useRouteContext } from "@tanstack/react-router"

import { AdminDashboard } from "@/components/appointments/admin-dashboard"

export const Route = createFileRoute("/_authed/dashboard/")({
  component: RouteComponent,
})

function RouteComponent() {
  const { isSuperAdmin } = useRouteContext({
    from: "/_authed",
  })

  return <div>{isSuperAdmin ? null : <AdminDashboard />}</div>
}
