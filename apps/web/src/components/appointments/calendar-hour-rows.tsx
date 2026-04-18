import { cn } from "@/lib/utils"

import { HOUR_HEIGHT, HOURS } from "./calendar-config"

export function CalendarHourRows({ bordered = false }: { bordered?: boolean }) {
  return (
    <>
      {HOURS.map((h) => (
        <div
          key={h}
          className={cn(
            "border-t border-border/40",
            bordered && "border-l border-border/40"
          )}
          style={{ height: HOUR_HEIGHT }}
        />
      ))}
    </>
  )
}
