"use client"

import { CalendarOffIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { Appointment } from "@wappiz/api-client/types/appointments"
import { es } from "date-fns/locale"

import { cn } from "@/lib/utils"

import { Calendar } from "../ui/calendar"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty"
import { ScrollArea } from "../ui/scroll-area"
import { aptColor, formatTimeRange } from "./calendar-config"

type CalendarSidebarProps = {
  periodLabel: string
  date: Date
  onDateChange: (d: Date) => void
  onAptClick: (apt: Appointment) => void
  apts: Appointment[]
}

export function CalendarSidebar({
  periodLabel,
  date,
  onDateChange,
  onAptClick,
  apts,
}: CalendarSidebarProps) {
  return (
    <aside
      className="flex h-full w-72 shrink-0 flex-col overflow-hidden border-l border-border/40 bg-background"
      aria-label="Panel de citas"
    >
      <Calendar
        mode="single"
        selected={date}
        onSelect={onDateChange}
        className="w-full shrink-0 bg-transparent"
        locale={es}
        required
      />

      <div className="flex min-h-0 flex-1 flex-col border-t border-border/40 p-3 pb-4">
        <div className="mb-2 flex shrink-0 items-baseline justify-between">
          <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            {periodLabel}
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

        <ScrollArea className="min-h-0 flex-1">
          <ul className="flex flex-col gap-1">
            {apts.map((appt) => (
              <AppointmentSidebarItem
                key={appt.id}
                apt={appt}
                onClick={() => onAptClick(appt)}
              />
            ))}
          </ul>
        </ScrollArea>
      </div>
    </aside>
  )
}

type AppointmentSidebarItemProps = {
  apt: Appointment
  onClick: () => void
}

function AppointmentSidebarItem({ apt, onClick }: AppointmentSidebarItemProps) {
  const terminal = ["completed", "cancelled", "no_show"].includes(apt.status)

  return (
    <li>
      <button
        type="button"
        aria-label={`${apt.customerName} — ${apt.serviceName}`}
        className={cn(
          "w-full rounded px-2 py-1 text-left text-xs transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          aptColor(apt.status),
          terminal && "opacity-40"
        )}
        onClick={onClick}
      >
        <span className="block truncate text-[10px] leading-none tabular-nums opacity-70">
          {formatTimeRange(apt.startsAt, apt.endsAt)}
        </span>
        <span className="mt-0.5 block truncate text-[11px] leading-snug font-semibold">
          {apt.customerName}
        </span>
        <span className="block truncate text-[10px] leading-snug opacity-60">
          {apt.serviceName}
          {apt.resourceName ? ` · ${apt.resourceName}` : ""}
        </span>
      </button>
    </li>
  )
}
