import { PostHogFeature, useFeatureFlagEnabled } from "@posthog/react"
import { createFileRoute, useRouteContext } from "@tanstack/react-router"

import { AdminDashboard } from "@/components/appointments/admin-dashboard"
import { AppointmentSkeleton } from "@/components/appointments/appointment-card"
import { AppointmentsCalendar } from "@/components/appointments/calendar"
import { PendingActivations } from "@/components/appointments/pending-activations"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/_authed/dashboard/")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
})

function RouteComponent() {
  const { isSuperAdmin } = useRouteContext({
    from: "/_authed",
  })

  const AdminComponent = (
    <PostHogFeature
      flag="calendar_view"
      match={true}
      fallback={<AdminDashboard />}
    >
      <AppointmentsCalendar />
    </PostHogFeature>
  )

  return <div>{isSuperAdmin ? <PendingActivations /> : AdminComponent}</div>
}

function PendingComponent() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Skeleton className="h-7 w-25" />
        <Skeleton className="h-7 w-25" />
        <Skeleton className="h-7 w-25" />
        <Skeleton className="h-7 w-25" />

        <Skeleton className="h-7 w-7" />
        <Skeleton className="h-7 w-45" />
        <Skeleton className="h-7 w-7" />
      </div>

      <Separator />

      <div className="flex flex-col divide-y divide-border">
        {Array.from({ length: 4 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: is an array generated
          <AppointmentSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
