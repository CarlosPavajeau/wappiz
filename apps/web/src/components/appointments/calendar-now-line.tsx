import { getHours, getMinutes } from "date-fns"

import { GRID_HEIGHT, HOUR_HEIGHT, START_HOUR } from "./calendar-config"

export function CalendarNowLine() {
  const now = new Date()
  const top = (getHours(now) - START_HOUR + getMinutes(now) / 60) * HOUR_HEIGHT
  if (top < 0 || top > GRID_HEIGHT) return null
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
      style={{ top }}
    >
      <div className="size-2 shrink-0 rounded-full bg-primary" />
      <div className="h-px flex-1 bg-primary" />
    </div>
  )
}
