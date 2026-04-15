import type { Appointment } from "@wappiz/api-client/types/appointments"
import { differenceInMinutes } from "date-fns"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { formatTime } from "./appointment-utils"
import { StatusActionMenu } from "./status-action-menu"
import { StatusBadge } from "./status-badge"

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "no_show"])

function formatDuration(startsAt: string, endsAt: string) {
  const mins = differenceInMinutes(new Date(endsAt), new Date(startsAt))
  if (mins < 60) {
    return `${mins}m`
  }
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function AppointmentSkeleton() {
  return (
    <div className="flex items-center gap-4 py-3">
      <Skeleton className="h-10 w-20 shrink-0" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
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
  const isTerminal = TERMINAL_STATUSES.has(appointment.status)
  const duration = formatDuration(appointment.startsAt, appointment.endsAt)

  const accentBar = (
    <div
      className={cn(
        "w-[3px] shrink-0 self-stretch rounded-full",
        isTerminal ? "bg-transparent" : "bg-primary"
      )}
    />
  )

  return (
    <>
      {/* ── Mobile layout ── */}
      <div
        className={cn(
          "flex flex-col gap-2 py-2 sm:hidden",
          isTerminal && "opacity-60"
        )}
      >
        {/* Row 1: time + badge */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">
            {formatTime(appointment.startsAt)}
          </span>
          <StatusBadge status={appointment.status} />
        </div>

        {/* Row 2: accent bar + customer name + service */}
        <button
          aria-label={`Ver detalles de ${appointment.customerName}`}
          className="flex cursor-pointer gap-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          onClick={onClick}
          type="button"
        >
          {accentBar}
          <div className="flex flex-col gap-0.5">
            <span className="text-base leading-snug font-bold">
              {appointment.customerName}
            </span>
            <span className="text-sm text-muted-foreground">
              {appointment.serviceName} · {appointment.resourceName}
            </span>
          </div>
        </button>

        {/* Row 3: action link */}
        {!isTerminal && (
          <StatusActionMenu appointment={appointment} asTextLink />
        )}
      </div>

      {/* ── Desktop layout ── */}
      <div
        className={cn(
          "hidden items-stretch gap-3 py-3 sm:flex",
          isTerminal && "opacity-60"
        )}
      >
        {/* Accent bar */}
        {accentBar}

        {/* Time + duration */}
        <div className="flex w-20 shrink-0 flex-col justify-center gap-0.5">
          <span className="text-sm font-semibold">
            {formatTime(appointment.startsAt)}
          </span>
          <span className="text-xs text-muted-foreground">{duration}</span>
        </div>

        {/* Customer + service — clickable */}
        <button
          aria-label={`Ver detalles de ${appointment.customerName}`}
          className="flex flex-1 cursor-pointer flex-col justify-center gap-0.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          onClick={onClick}
          type="button"
        >
          <span className="text-sm font-semibold">
            {appointment.customerName}
          </span>
          <span className="text-sm text-muted-foreground">
            {appointment.serviceName} · {appointment.resourceName}
          </span>
        </button>

        {/* Badge + action */}
        <div className="flex items-center gap-3">
          <StatusBadge status={appointment.status} />
          {!isTerminal && <StatusActionMenu appointment={appointment} />}
        </div>
      </div>
    </>
  )
}
