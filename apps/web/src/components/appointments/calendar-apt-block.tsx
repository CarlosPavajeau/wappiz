import type { Appointment } from "@wappiz/api-client/types/appointments"

import { cn } from "@/lib/utils"

import {
  aptColor,
  aptHeight,
  aptTop,
  formatTimeRange,
} from "./calendar-config"

export function CalendarAptBlock({
  apt,
  onClick,
}: {
  apt: Appointment
  onClick: () => void
}) {
  const top = aptTop(apt.startsAt)
  const height = aptHeight(apt.startsAt, apt.endsAt)
  const terminal = ["completed", "cancelled", "no_show"].includes(apt.status)

  return (
    <button
      type="button"
      aria-label={`${apt.customerName} — ${apt.serviceName}`}
      className={cn(
        "absolute inset-x-0.5 rounded-md px-2 py-1 text-left text-xs transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        aptColor(apt.status),
        terminal && "opacity-50"
      )}
      style={{ height, overflow: "hidden", top }}
      onClick={onClick}
    >
      <span className="block truncate text-[10px] leading-tight tabular-nums opacity-60">
        {formatTimeRange(apt.startsAt, apt.endsAt)}
      </span>
      <span className="block truncate font-semibold leading-tight">
        {apt.customerName}
      </span>
      {height > 52 && (
        <span className="block truncate leading-tight opacity-70">
          {apt.serviceName} · {apt.resourceName}
        </span>
      )}
    </button>
  )
}
