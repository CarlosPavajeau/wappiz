import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

import {
  type Appointment,
  formatTime,
  statusLabel,
  statusVariant,
} from "./appointment-utils"

export function AppointmentSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border p-3">
      <Skeleton className="h-9 w-16 shrink-0" />
      <Skeleton className="h-9 flex-1" />
    </div>
  )
}

export function AppointmentCard({
  appointment,
  onClick,
}: {
  appointment: Appointment
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="flex w-full cursor-pointer items-stretch gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={onClick}
      aria-label={`Ver detalles: ${appointment.serviceName} con ${appointment.customerName} a las ${formatTime(appointment.startsAt)}`}
    >
      <div className="flex min-w-18 flex-col items-end justify-center gap-0.5 tabular-nums">
        <span className="text-xs font-medium text-foreground">
          {formatTime(appointment.startsAt)}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatTime(appointment.endsAt)}
        </span>
      </div>

      <Separator orientation="vertical" />

      <div className="flex flex-1 flex-col justify-center gap-1">
        <div className="flex items-center gap-2">
          <Badge
            variant={statusVariant(appointment.status)}
            className="rounded-sm"
          >
            {statusLabel(appointment.status)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {`${appointment.resourceName} · ${appointment.serviceName}`}
        </p>
      </div>
    </button>
  )
}
