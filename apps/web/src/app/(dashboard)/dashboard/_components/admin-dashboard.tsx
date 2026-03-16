"use client"

import { useQuery } from "@tanstack/react-query"
import { addDays, format, isToday, subDays } from "date-fns"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { api } from "@/lib/client-api"

import { AppointmentCard, AppointmentSkeleton } from "./appointment-card"
import { AppointmentDetailModal } from "./appointment-detail-modal"
import { type Appointment } from "./appointment-utils"

function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd")
}

export function AdminDashboard() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

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

  const openDetail = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setDetailOpen(true)
  }

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
            Hoy
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
          Ha ocurrido un error al cargar las citas. Por favor, inténtalo de
          nuevo.
        </p>
      ) : sorted.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarDays className="size-8" aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No se encontraron citas</EmptyTitle>
            <EmptyDescription>
              No hay citas programadas para esta fecha.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <ol aria-label="Appointments" className="flex flex-col gap-2">
            {sorted.map((appointment) => (
              <li key={appointment.id}>
                <AppointmentCard
                  appointment={appointment}
                  onClick={() => openDetail(appointment)}
                />
              </li>
            ))}
          </ol>

          <AppointmentDetailModal
            appointment={selectedAppointment}
            open={detailOpen}
            onOpenChange={setDetailOpen}
          />
        </>
      )}
    </div>
  )
}
