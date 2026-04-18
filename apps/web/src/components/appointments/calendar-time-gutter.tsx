import { cn } from "@/lib/utils"

import { HOUR_HEIGHT, HOURS, formatHour } from "./calendar-config"

export function CalendarTimeGutter({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("shrink-0 select-none", compact ? "w-12" : "w-14")}>
      {HOURS.map((h) => (
        <div key={h} className="relative" style={{ height: HOUR_HEIGHT }}>
          <span
            className={cn(
              "absolute -top-2.5 text-[11px] text-muted-foreground tabular-nums",
              compact ? "right-1.5" : "right-2"
            )}
          >
            {formatHour(h)}
          </span>
        </div>
      ))}
    </div>
  )
}
