"use client"

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CalendarOffIcon,
  Refresh03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery } from "@tanstack/react-query"
import type { Appointment } from "@wappiz/api-client/types/appointments"
import { addDays, format, isToday, parseISO, subDays } from "date-fns"
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { api } from "@/lib/client-api"

import { AppointmentCard, AppointmentSkeleton } from "./appointment-card"
import { AppointmentDetailModal } from "./appointment-detail-modal"
import { STATUS_LABEL } from "./appointment-utils"
import { FilterSelect } from "./filter-select"

function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd")
}

export function AdminDashboard() {
  const [dateParam, setDateParam] = useQueryState(
    "date",
    parseAsString.withDefault(toDateKey(new Date()))
  )
  const [resourceIds, setResourceIds] = useQueryState(
    "resources",
    parseAsArrayOf(parseAsString).withDefault([])
  )
  const [serviceIds, setServiceIds] = useQueryState(
    "services",
    parseAsArrayOf(parseAsString).withDefault([])
  )
  const [statuses, setStatuses] = useQueryState(
    "statuses",
    parseAsArrayOf(parseAsString).withDefault([
      "in_progress",
      "confirmed",
      "check_in",
    ])
  )
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const selectedDate = parseISO(dateParam)
  const isViewingToday = isToday(selectedDate)

  const {
    data: appointments,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryFn: () =>
      api.appointments.list({
        params: {
          date: dateParam,
          ...(resourceIds.length > 0 && { resource: resourceIds }),
          ...(serviceIds.length > 0 && { service: serviceIds }),
          ...(statuses.length > 0 && { status: statuses }),
        },
      }),
    queryKey: ["appointments", dateParam, resourceIds, serviceIds, statuses],
  })

  const { data: resources, isLoading: isLoadingResources } = useQuery({
    queryFn: () => api.resources.list(),
    queryKey: ["resources"],
  })

  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryFn: () => api.services.list(),
    queryKey: ["services"],
  })

  const statusItems = Object.entries(STATUS_LABEL).map(([id, label]) => ({
    id,
    label,
  }))

  const filtered = appointments
    ? [...appointments].toSorted(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      )
    : []

  const goToPrev = () => setDateParam(toDateKey(subDays(selectedDate, 1)))
  const goToNext = () => setDateParam(toDateKey(addDays(selectedDate, 1)))
  const goToToday = () => setDateParam(null)

  const openDetail = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setDetailOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        <FilterSelect
          label="Recursos"
          items={(resources ?? []).map((r) => ({ id: r.id, label: r.name }))}
          selectedIds={resourceIds}
          onSelectedIdsChange={setResourceIds}
          isLoading={isLoadingResources}
        />
        <FilterSelect
          label="Servicios"
          items={(services ?? []).map((s) => ({ id: s.id, label: s.name }))}
          selectedIds={serviceIds}
          onSelectedIdsChange={setServiceIds}
          isLoading={isLoadingServices}
        />
        <FilterSelect
          label="Estado"
          items={statusItems}
          selectedIds={statuses}
          onSelectedIdsChange={setStatuses}
        />

        <div className="flex items-center gap-1">
          <Button
            aria-label="Previous day"
            size="icon-sm"
            variant="outline"
            onClick={goToPrev}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          </Button>

          <DatePicker
            value={selectedDate}
            onChange={(d) => setDateParam(d ? toDateKey(d) : null)}
          />

          <Button
            aria-label="Next day"
            size="icon-sm"
            variant="outline"
            onClick={goToNext}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          </Button>

          {!isViewingToday && (
            <Button size="sm" variant="ghost" onClick={goToToday}>
              Hoy
            </Button>
          )}
        </div>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" onClick={() => refetch()}>
                <HugeiconsIcon icon={Refresh03Icon} strokeWidth={2} />
              </Button>
            }
          />
          <TooltipContent>
            <p>Recargar citas</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator />

      {isLoading ? (
        <div className="flex flex-col divide-y divide-border">
          {Array.from({ length: 4 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: is an array generated
            <AppointmentSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">
          Ha ocurrido un error al cargar las citas. Por favor, inténtalo de
          nuevo.
        </p>
      ) : filtered.length === 0 ? (
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
      ) : (
        <ol
          aria-label="Appointments"
          className="flex flex-col divide-y divide-border gap-2"
        >
          {filtered.map((appointment) => (
            <li key={appointment.id}>
              <AppointmentCard
                appointment={appointment}
                onClick={() => openDetail(appointment)}
              />
            </li>
          ))}
        </ol>
      )}

      <AppointmentDetailModal
        appointment={selectedAppointment}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
