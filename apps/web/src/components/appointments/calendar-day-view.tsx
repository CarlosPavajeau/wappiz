import type { Appointment } from "@wappiz/api-client/types/appointments"
import { isToday } from "date-fns"
import { useMemo } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"

import { CalendarAptBlock } from "./calendar-apt-block"
import { layoutApts } from "./calendar-config"
import { CalendarHourRows } from "./calendar-hour-rows"
import { CalendarNowLine } from "./calendar-now-line"
import { CalendarTimeGutter } from "./calendar-time-gutter"

export function CalendarDayView({
  date,
  apts,
  onAptClick,
}: {
  date: Date
  apts: Appointment[]
  onAptClick: (a: Appointment) => void
}) {
  const placed = useMemo(() => layoutApts(apts), [apts])

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex pt-4">
        <CalendarTimeGutter />
        <div className="relative min-w-0 flex-1 pr-2">
          <CalendarHourRows />
          {isToday(date) && <CalendarNowLine />}
          {placed.map(({ apt, col, colCount }) => (
            <CalendarAptBlock
              key={apt.id}
              apt={apt}
              col={col}
              colCount={colCount}
              onClick={() => onAptClick(apt)}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
