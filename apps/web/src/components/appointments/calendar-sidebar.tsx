"use client"

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CalendarOffIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { Appointment } from "@wappiz/api-client/types/appointments"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { es } from "date-fns/locale"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { Calendar } from "../ui/calendar"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty"
import { AppointmentCard } from "./appointment-card"
import { CalendarAptBlock } from "./calendar-apt-block"
import {
  aptColor,
  formatTimeRange,
  groupByDate,
  toDateKey,
  WEEK_OPTS,
} from "./calendar-config"

const WEEKDAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"]

function MiniCalendar({
  date,
  onDateChange,
  apts,
}: {
  date: Date
  onDateChange: (d: Date) => void
  apts: Appointment[]
}) {
  const [monthView, setMonthView] = useState(
    () => new Date(date.getFullYear(), date.getMonth(), 1)
  )

  useEffect(() => {
    if (
      date.getMonth() !== monthView.getMonth() ||
      date.getFullYear() !== monthView.getFullYear()
    ) {
      setMonthView(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }, [date, monthView])

  const monthStart = startOfMonth(monthView)
  const gridStart = startOfWeek(monthStart, WEEK_OPTS)
  const gridEnd = endOfWeek(endOfMonth(monthView), WEEK_OPTS)
  const days = eachDayOfInterval({ end: gridEnd, start: gridStart })
  const byDate = groupByDate(apts)
  const monthLabel = format(monthView, "MMMM yyyy", { locale: es })

  return (
    <div className="p-3 pb-2 select-none">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <Button
          aria-label="Mes anterior"
          size="icon-sm"
          variant="ghost"
          onClick={() => setMonthView((m) => subMonths(m, 1))}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
        </Button>
        <span className="text-[13px] font-medium capitalize">{monthLabel}</span>
        <Button
          aria-label="Mes siguiente"
          size="icon-sm"
          variant="ghost"
          onClick={() => setMonthView((m) => addMonths(m, 1))}
        >
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
        </Button>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAY_SHORT.map((w) => (
          <div
            key={w}
            className="py-1 text-center text-[11px] text-muted-foreground"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px">
        {days.map((d) => {
          const inMonth = isSameMonth(d, monthView)
          const isSel = isSameDay(d, date)
          const today = isToday(d)
          const key = toDateKey(d)
          const hasDots = (byDate[key]?.length ?? 0) > 0

          return (
            <button
              key={key}
              type="button"
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-md text-[12.5px] tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                isSel
                  ? "bg-primary font-medium text-primary-foreground"
                  : today
                    ? "bg-muted text-foreground"
                    : "text-foreground hover:bg-muted/60",
                !inMonth && !isSel && "text-muted-foreground opacity-35"
              )}
              onClick={() => onDateChange(new Date(d))}
            >
              {format(d, "d")}
              {hasDots && !isSel && (
                <span className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function CalendarSidebar({
  date,
  onDateChange,
  apts,
}: {
  date: Date
  onDateChange: (d: Date) => void
  apts: Appointment[]
}) {
  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-border/40 bg-background">
      <Calendar
        mode="single"
        selected={date}
        onSelect={onDateChange}
        className="w-full bg-transparent"
        locale={es}
        required
      />

      <div className="border-t border-border/40 p-3 pb-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            {format(date, "EEEE, d 'de' MMMM", { locale: es })}
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {apts.length}
          </span>
        </div>

        {apts.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={CalendarOffIcon} strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>No se encontraron citas</EmptyTitle>
              <EmptyDescription>
                No hay citas programadas para esta fecha o para los filtros
                aplicados.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        <ul className="flex flex-col gap-1 overflow-y-auto">
          {apts.map((appt) => (
            <AppointmentSidebarItem key={appt.id} apt={appt} />
          ))}
        </ul>
      </div>
    </aside>
  )
}

type AppointmentSidebarItemProps = {
  apt: Appointment
}

function AppointmentSidebarItem({ apt }: AppointmentSidebarItemProps) {
  const terminal = ["completed", "cancelled", "no_show"].includes(apt.status)

  return (
    <li
      role="listitem"
      aria-label={`${apt.customerName} — ${apt.serviceName}`}
      className={cn(
        "rounded-r border-l-[3px] border-current py-1 pr-2 pl-1.5 text-left text-xs transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        aptColor(apt.status),
        terminal && "opacity-40"
      )}
    >
      <span className="block truncate text-[10px] leading-none tabular-nums opacity-55">
        {formatTimeRange(apt.startsAt, apt.endsAt)}
      </span>
      <span className="mt-0.5 block truncate text-[11px] leading-snug font-semibold">
        {apt.customerName}
      </span>
      <span className="block truncate text-[10px] leading-snug opacity-60">
        {apt.serviceName}
        {apt.resourceName ? ` · ${apt.resourceName}` : ""}
      </span>
    </li>
  )
}
