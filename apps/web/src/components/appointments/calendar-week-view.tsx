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
      <div className="flex border-b border-border/40">
        <div className="w-14 shrink-0" />
        {days.map((d) => {
          const today = isToday(d)
          return (
            <button
              key={d.toISOString()}
              type="button"
              className="group flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={() => onDayClick(d)}
            >
              <span
                className={cn(
                  "text-[10px] font-medium tracking-widest uppercase",
                  today ? "text-primary" : "text-muted-foreground"
                )}
              >
                {format(d, "EEE", { locale: es })}
              </span>
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors",
                  today
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground group-hover:bg-muted"
                )}
              >
                {format(d, "d")}
              </span>
            </button>
          )
        })}
      </div>

      <ScrollArea className="h-[calc(100vh-20rem)]">
        <div className="flex pt-4">
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
