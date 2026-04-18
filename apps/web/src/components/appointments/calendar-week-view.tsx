"use client"

import type { Appointment } from "@wappiz/api-client/types/appointments"
import { addDays, format, isToday, startOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import { useMemo } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import { CalendarAptBlock } from "./calendar-apt-block"
import { WEEK_OPTS, groupByDate, toDateKey } from "./calendar-config"
import { CalendarHourRows } from "./calendar-hour-rows"
import { CalendarNowLine } from "./calendar-now-line"
import { CalendarTimeGutter } from "./calendar-time-gutter"

export function CalendarWeekView({
  date,
  apts,
  onAptClick,
  onDayClick,
}: {
  date: Date
  apts: Appointment[]
  onAptClick: (a: Appointment) => void
  onDayClick: (d: Date) => void
}) {
  const weekStart = startOfWeek(date, WEEK_OPTS)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const byDate = useMemo(() => groupByDate(apts), [apts])

  return (
    <div className="flex flex-col">
      {/* Day headers */}
      <div className="flex border-b border-border/40">
        <div className="w-14 shrink-0" />
        {days.map((d) => (
          <button
            key={d.toISOString()}
            type="button"
            className="flex flex-1 flex-col items-center rounded-sm py-2 transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            onClick={() => onDayClick(d)}
          >
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              {format(d, "EEE", { locale: es })}
            </span>
            <span
              className={cn(
                "mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-semibold",
                isToday(d)
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground"
              )}
            >
              {format(d, "d")}
            </span>
          </button>
        ))}
      </div>

      {/* Scrollable time grid */}
      <ScrollArea className="h-[calc(100vh-18rem)]">
        <div className="flex">
          <CalendarTimeGutter />
          {days.map((d) => {
            const key = toDateKey(d)
            const dayApts = byDate[key] ?? []
            return (
              <div
                key={key}
                className="relative min-w-0 flex-1 border-l border-border/40"
              >
                <CalendarHourRows />
                {isToday(d) && <CalendarNowLine />}
                {dayApts.map((a) => (
                  <CalendarAptBlock
                    key={a.id}
                    apt={a}
                    onClick={() => onAptClick(a)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
