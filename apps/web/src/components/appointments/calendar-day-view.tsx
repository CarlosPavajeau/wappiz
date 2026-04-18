import type { Appointment } from "@wappiz/api-client/types/appointments"
import { isToday } from "date-fns"

import { ScrollArea } from "@/components/ui/scroll-area"

import { CalendarAptBlock } from "./calendar-apt-block"
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
  return (
    <ScrollArea className="h-[calc(100vh-14rem)]">
      <div className="flex">
        <CalendarTimeGutter />
        <div className="relative min-w-0 flex-1">
          <CalendarHourRows />
          {isToday(date) && <CalendarNowLine />}
          {apts.map((a) => (
            <CalendarAptBlock key={a.id} apt={a} onClick={() => onAptClick(a)} />
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
