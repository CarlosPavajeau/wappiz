import { cn } from "@/lib/utils"

import { HOUR_HEIGHT, HOURS } from "./calendar-config"

export function CalendarHourRows({ bordered = false }: { bordered?: boolean }) {
  return (
    <>
      {HOURS.map((h, i) => (
        <div
          key={h}
          className={cn(
            "relative border-t border-border/40",
            i % 2 !== 0 && "bg-muted/[0.04]",
            bordered && "border-l border-border/40"
          )}
          style={{ height: HOUR_HEIGHT }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/25"
            style={{ top: HOUR_HEIGHT / 2 }}
          />
        </div>
      ))}
    </>
  )
}
