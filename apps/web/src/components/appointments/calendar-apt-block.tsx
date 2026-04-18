import type { Appointment } from "@wappiz/api-client/types/appointments"

import { cn } from "@/lib/utils"

import { aptColor, aptHeight, aptTop, formatTimeRange } from "./calendar-config"

export function CalendarAptBlock({
  apt,
  col = 0,
  colCount = 1,
  onClick,
}: {
  apt: Appointment
  col?: number
  colCount?: number
  onClick: () => void
}) {
  const top = aptTop(apt.startsAt)
  const height = aptHeight(apt.startsAt, apt.endsAt)
  const terminal = ["completed", "cancelled", "no_show"].includes(apt.status)
  const pct = 100 / colCount
  const leftPct = col * pct

  return (
    <button
      type="button"
      aria-label={`${apt.customerName} — ${apt.serviceName}`}
      className={cn(
        "absolute rounded px-2 py-1 text-left text-xs transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        aptColor(apt.status),
        terminal && "opacity-40"
      )}
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 1px)`,
        width: `calc(${pct}% - 3px)`,
        overflow: "hidden",
      }}
      onClick={onClick}
    >
      <span className="block truncate text-[10px] leading-none tabular-nums opacity-70">
        {formatTimeRange(apt.startsAt, apt.endsAt)}
      </span>
      <span className="mt-0.5 block truncate text-[11px] leading-snug font-semibold">
        {apt.customerName}
      </span>
      {height > 52 && (
        <span className="block truncate text-[10px] leading-snug opacity-70">
          {apt.serviceName}
          {apt.resourceName ? ` · ${apt.resourceName}` : ""}
        </span>
      )}
    </button>
  )
}
