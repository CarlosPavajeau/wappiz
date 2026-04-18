import { HOUR_HEIGHT, HOURS, formatHour } from "./calendar-config"

export function CalendarTimeGutter() {
  return (
    <div className="w-14 shrink-0 select-none pt-2">
      {HOURS.map((h) => (
        <div key={h} className="relative" style={{ height: HOUR_HEIGHT }}>
          <span className="absolute -top-2.5 right-2 text-[11px] tabular-nums text-muted-foreground">
            {formatHour(h)}
          </span>
        </div>
      ))}
    </div>
  )
}
