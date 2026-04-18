"use client"

import type { Appointment } from "@wappiz/api-client/types/appointments"
import { addDays, format, isToday, startOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import { useMemo } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import { CalendarAptBlock } from "./calendar-apt-block"
import {
  WEEK_OPTS,
  aptColor,
  formatStartTime,
  groupByDate,
  toDateKey,
} from "./calendar-config"
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
    <div className="h-full">
      {/* Desktop: time grid */}
      <div className="hidden h-full flex-col md:flex">
        <div className="flex shrink-0 border-b border-border/40">
          <div className="w-14 shrink-0" />
          {days.map((d) => {
            const today = isToday(d)
            return (
              <button
                key={d.toISOString()}
                type="button"
                aria-label={format(d, "EEEE d 'de' MMMM", { locale: es })}
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

        <ScrollArea className="min-h-0 flex-1">
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

      {/* Mobile: agenda list */}
      <div className="md:hidden">
        <ul className="divide-y divide-border/40">
          {days.map((d) => {
            const key = toDateKey(d)
            const dayApts = byDate[key] ?? []
            const today = isToday(d)

            return (
              <li key={key} className="py-3">
                <button
                  type="button"
                  aria-label={format(d, "EEEE d 'de' MMMM", { locale: es })}
                  className="mb-2 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  onClick={() => onDayClick(d)}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums",
                      today
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground"
                    )}
                  >
                    {format(d, "d")}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-medium tracking-widest uppercase",
                      today ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {format(d, "EEE", { locale: es })}
                  </span>
                </button>

                {dayApts.length === 0 ? (
                  <p className="pl-9 text-[12px] text-muted-foreground">
                    Sin citas
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1 pl-9">
                    {dayApts.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          aria-label={`${a.customerName} — ${a.serviceName}`}
                          className={cn(
                            "flex w-full items-baseline gap-2 rounded px-2 py-1.5 text-left transition-opacity hover:opacity-80 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none",
                            aptColor(a.status)
                          )}
                          onClick={() => onAptClick(a)}
                        >
                          <span className="min-w-0 flex-1 truncate text-[13px] leading-tight font-medium">
                            {a.customerName}
                          </span>
                          <span className="shrink-0 text-[11px] tabular-nums opacity-60">
                            {formatStartTime(a.startsAt)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
