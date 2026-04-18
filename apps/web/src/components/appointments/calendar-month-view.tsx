"use client"

import type { Appointment } from "@wappiz/api-client/types/appointments"
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { useMemo } from "react"

import { cn } from "@/lib/utils"

import {
  WEEK_OPTS,
  aptColor,
  formatStartTime,
  groupByDate,
  toDateKey,
} from "./calendar-config"

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

export function CalendarMonthView({
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
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const gridStart = startOfWeek(monthStart, WEEK_OPTS)
  const gridEnd = endOfWeek(monthEnd, WEEK_OPTS)
  const days = eachDayOfInterval({ end: gridEnd, start: gridStart })
  const byDate = useMemo(() => groupByDate(apts), [apts])

  return (
    <div>
      {/* Weekday labels */}
      <div className="grid grid-cols-7 border-b border-border/40">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l border-border/40">
        {days.map((day) => {
          const key = toDateKey(day)
          const dayApts = byDate[key] ?? []
          const extra = dayApts.length - 2
          const outOfMonth = !isSameMonth(day, date)

          return (
            <div
              key={key}
              className={cn(
                "min-h-[5.5rem] border-r border-b border-border/40 p-1.5 transition-colors hover:bg-muted/30",
                outOfMonth && "opacity-40"
              )}
            >
              <button
                type="button"
                className={cn(
                  "mb-1 flex size-6 items-center justify-center rounded-full text-sm font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isToday(day)
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "text-foreground hover:bg-muted"
                )}
                onClick={() => onDayClick(day)}
              >
                {format(day, "d")}
              </button>

              <div className="flex flex-col gap-0.5">
                {dayApts.slice(0, 2).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-xs font-medium transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      aptColor(a.status)
                    )}
                    onClick={() => onAptClick(a)}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {a.customerName}
                    </span>
                    <span className="shrink-0 tabular-nums opacity-60">
                      {formatStartTime(a.startsAt)}
                    </span>
                  </button>
                ))}
                {extra > 0 && (
                  <button
                    type="button"
                    className="px-1 text-left text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
                    onClick={() => onDayClick(day)}
                  >
                    +{extra} más
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
