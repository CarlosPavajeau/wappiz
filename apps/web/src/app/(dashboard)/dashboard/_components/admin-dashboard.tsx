"use client"

import { useQuery } from "@tanstack/react-query"
import { addDays, format, isToday, subDays } from "date-fns"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/client-api"

const STATUS_VARIANT = {
  cancelled: "destructive",
  confirmed: "default",
  pending: "outline",
} as const

function statusVariant(status: string) {
  return STATUS_VARIANT[status as keyof typeof STATUS_VARIANT] ?? "outline"
}

function formatTime(iso: string) {
  return format(new Date(iso), "h:mm a")
}

function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd")
}

function AppointmentSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border p-3">
      <Skeleton className="h-9 w-16 shrink-0" />
      <Skeleton className="h-9 flex-1" />
    </div>
  )
}

export function AdminDashboard() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const dateKey = toDateKey(selectedDate)
  const isViewingToday = isToday(selectedDate)

  const {
    data: appointments,
    isLoading,
    isError,
  } = useQuery({
    queryFn: () => api.appointments.list({ params: { date: dateKey } }),
    queryKey: ["appointments", dateKey],
  })

  const sorted = appointments
    ? [...appointments].toSorted(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      )
    : []

  const goToPrev = () => setSelectedDate((d) => subDays(d, 1))
  const goToNext = () => setSelectedDate((d) => addDays(d, 1))
  const goToToday = () => setSelectedDate(new Date())

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5">
        <Button
          aria-label="Previous day"
          size="icon-sm"
          variant="outline"
          onClick={goToPrev}
        >
          <ChevronLeft />
        </Button>

        <DatePicker value={selectedDate} onChange={setSelectedDate} />

        <Button
          aria-label="Next day"
          size="icon-sm"
          variant="outline"
          onClick={goToNext}
        >
          <ChevronRight />
        </Button>

        {!isViewingToday && (
          <Button size="sm" variant="ghost" onClick={goToToday}>
            Today
          </Button>
        )}
      </div>

      <Separator />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <AppointmentSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">
          Failed to load appointments. Please try again.
        </p>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <CalendarDays className="size-8" aria-hidden="true" />
          <p className="text-sm">No appointments for this day</p>
        </div>
      ) : (
        <ol aria-label="Appointments" className="flex flex-col gap-2">
          {sorted.map((appointment) => (
            <li
              key={appointment.id}
              className="flex items-stretch gap-3 rounded-lg border border-border p-3"
            >
              <div className="flex min-w-[4.5rem] flex-col items-end justify-center gap-0.5 tabular-nums">
                <span className="text-xs font-medium text-foreground">
                  {formatTime(appointment.startsAt)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(appointment.endsAt)}
                </span>
              </div>

              <Separator orientation="vertical" />

              <div className="flex flex-1 flex-col justify-center gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(appointment.status)}>
                    {appointment.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {`${appointment.resourceName} · ${appointment.serviceName}`}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
