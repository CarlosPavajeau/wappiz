import { HOUR_HEIGHT, HOURS, formatHour } from "./calendar-config"

export function CalendarTimeGutter() {
  return (
    <div className="w-14 shrink-0 pt-2 select-none">
      {HOURS.map((h) => (
        <div key={h} className="relative" style={{ height: HOUR_HEIGHT }}>
          <span className="absolute -top-2.5 right-2 text-[11px] text-muted-foreground tabular-nums">
            {formatHour(h)}
          </span>
        </div>
      ))}
    </div>
  )
}
