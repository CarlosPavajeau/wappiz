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
import { es } from "date-fns/locale"
import { useMemo } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
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

  const agendaDays = useMemo(() => {
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
    return monthDays.filter(
      (d) => isToday(d) || (byDate[toDateKey(d)]?.length ?? 0) > 0
    )
  }, [monthStart, monthEnd, byDate])

  return (
    <div className="flex h-full flex-col">
      {/* Desktop grid view */}
      <div className="hidden flex-1 flex-col overflow-hidden md:flex">
        <div className="grid shrink-0 grid-cols-7 border-b border-border/40">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="py-2 text-center text-[10px] font-medium tracking-widest text-muted-foreground uppercase"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-7 border-l border-border/40">
            {days.map((day) => {
              const key = toDateKey(day)
              const dayApts = byDate[key] ?? []
              const extra = dayApts.length - 2
              const outOfMonth = !isSameMonth(day, date)
              const today = isToday(day)

              return (
                <div
                  key={key}
                  className={cn(
                    "group min-h-22 border-r border-b border-border/40 p-1.5 transition-colors hover:bg-muted/20",
                    outOfMonth && "opacity-35"
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      "mb-1.5 flex size-6 items-center justify-center rounded-full text-[11px] leading-none font-semibold tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      today
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                    onClick={() => onDayClick(day)}
                    aria-label={format(day, "EEEE d 'de' MMMM", { locale: es })}
                  >
                    {format(day, "d")}
                  </button>

                  <div className="flex flex-col gap-px">
                    {dayApts.slice(0, 2).map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className={cn(
                          "flex w-full items-baseline gap-1 rounded-sm px-1 py-0.5 text-left transition-opacity hover:opacity-75 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none",
                          aptColor(a.status)
                        )}
                        onClick={() => onAptClick(a)}
                      >
                        <span className="min-w-0 flex-1 truncate text-[11px] leading-tight font-medium">
                          {a.customerName}
                        </span>
                        <span className="shrink-0 text-[10px] tabular-nums opacity-50">
                          {formatStartTime(a.startsAt)}
                        </span>
                      </button>
                    ))}
                    {extra > 0 && (
                      <button
                        type="button"
                        className="px-1 text-left text-[10px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
                        onClick={() => onDayClick(day)}
                        aria-label={`Ver ${extra} cita${extra === 1 ? "" : "s"} más el ${format(day, "d 'de' MMMM", { locale: es })}`}
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
      </div>

      {/* Mobile agenda view */}
      <div className="flex flex-1 flex-col overflow-hidden md:hidden">
        {agendaDays.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay citas este mes.
          </p>
        ) : (
          <ScrollArea className="flex-1">
            <ul className="divide-y divide-border/40">
              {agendaDays.map((day) => {
                const key = toDateKey(day)
                const dayApts = byDate[key] ?? []
                const today = isToday(day)

                return (
                  <li key={key} className="px-0 py-3">
                    <button
                      type="button"
                      className="mb-2 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      onClick={() => onDayClick(day)}
                      aria-label={format(day, "EEEE d 'de' MMMM", {
                        locale: es,
                      })}
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums",
                          today
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      <span
                        className={cn(
                          "text-[11px] font-medium tracking-widest uppercase",
                          today ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {format(day, "EEE", { locale: es })}
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
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
