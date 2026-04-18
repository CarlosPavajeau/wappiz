"use client"

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Refresh03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import type { Appointment } from "@wappiz/api-client/types/appointments"
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns"
import { es } from "date-fns/locale"
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs"
import { useMemo, useState } from "react"

import { AppointmentDetailModal } from "@/components/appointments/appointment-detail-modal"
import { FilterSelect } from "@/components/appointments/filter-select"
import { CalendarDayView } from "@/components/appointments/calendar-day-view"
import { CalendarMonthView } from "@/components/appointments/calendar-month-view"
import { CalendarSkeleton } from "@/components/appointments/calendar-skeleton"
import { CalendarWeekView } from "@/components/appointments/calendar-week-view"
import {
  STATUS_ITEMS,
  WEEK_OPTS,
  type CalView,
  toDateKey,
} from "@/components/appointments/calendar-config"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/client-api"

export const Route = createFileRoute(
  "/_authed/dashboard/experimental/calendar"
)({
  component: CalendarPage,
})

function CalendarPage() {
  const [view, setView] = useQueryState(
    "calView",
    parseAsString.withDefault("day")
  )
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
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const calView = (view ?? "day") as CalView
  const selectedDate = useMemo(() => parseISO(dateParam), [dateParam])

  const { from, to } = useMemo(() => {
    if (calView === "week") {
      return {
        from: toDateKey(startOfWeek(selectedDate, WEEK_OPTS)),
        to: toDateKey(endOfWeek(selectedDate, WEEK_OPTS)),
      }
    }
    if (calView === "month") {
      return {
        from: toDateKey(startOfMonth(selectedDate)),
        to: toDateKey(endOfMonth(selectedDate)),
      }
    }
    return { from: dateParam, to: dateParam }
  }, [calView, dateParam, selectedDate])

  const { data: resources, isLoading: isLoadingResources } = useQuery({
    queryFn: () => api.resources.list(),
    queryKey: ["resources"],
    staleTime: 5 * 60 * 1000,
  })

  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryFn: () => api.services.list(),
    queryKey: ["services"],
    staleTime: 5 * 60 * 1000,
  })

  const { data, isError, isLoading, refetch } = useQuery({
    queryFn: () =>
      api.appointments.list({
        params: {
          from,
          to,
          ...(resourceIds.length > 0 && { resource: resourceIds }),
          ...(serviceIds.length > 0 && { service: serviceIds }),
          ...(statuses.length > 0 && { status: statuses }),
        },
      }),
    queryKey: [
      "appointments",
      "calendar",
      calView,
      from,
      to,
      resourceIds,
      serviceIds,
      statuses,
    ],
  })

  const apts = useMemo(
    () =>
      (data ?? []).toSorted(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      ),
    [data]
  )

  const goBy = (dir: 1 | -1) => {
    const d = selectedDate
    if (calView === "day") {
      setDateParam(toDateKey(dir === 1 ? addDays(d, 1) : subDays(d, 1)))
    } else if (calView === "week") {
      setDateParam(toDateKey(dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1)))
    } else {
      setDateParam(toDateKey(dir === 1 ? addMonths(d, 1) : subMonths(d, 1)))
    }
  }

  const periodLabel = useMemo(() => {
    if (calView === "day") {
      return format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })
    }
    if (calView === "week") {
      const s = startOfWeek(selectedDate, WEEK_OPTS)
      const e = endOfWeek(selectedDate, WEEK_OPTS)
      return `${format(s, "d MMM", { locale: es })} – ${format(e, "d MMM yyyy", { locale: es })}`
    }
    return format(selectedDate, "MMMM yyyy", { locale: es })
  }, [calView, selectedDate])

  const openApt = (a: Appointment) => {
    setSelectedApt(a)
    setDetailOpen(true)
  }

  const switchToDay = (d: Date) => {
    setDateParam(toDateKey(d))
    setView("day")
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Page title */}
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold">Calendario</h1>
        <Badge className="text-[10px] text-muted-foreground" variant="outline">
          Experimental
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        <FilterSelect
          isLoading={isLoadingResources}
          items={(resources ?? []).map((r) => ({ id: r.id, label: r.name }))}
          label="Recursos"
          selectedIds={resourceIds}
          onSelectedIdsChange={setResourceIds}
        />
        <FilterSelect
          isLoading={isLoadingServices}
          items={(services ?? []).map((s) => ({ id: s.id, label: s.name }))}
          label="Servicios"
          selectedIds={serviceIds}
          onSelectedIdsChange={setServiceIds}
        />
        <FilterSelect
          items={STATUS_ITEMS}
          label="Estado"
          selectedIds={statuses}
          onSelectedIdsChange={setStatuses}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={calView} onValueChange={(v) => v && setView(v)}>
          <TabsList variant="line">
            <TabsTrigger value="day">Día</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mes</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              aria-label="Período anterior"
              size="icon-sm"
              variant="outline"
              onClick={() => goBy(-1)}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
            </Button>

            {calView === "day" ? (
              <DatePicker
                value={selectedDate}
                onChange={(d) => setDateParam(d ? toDateKey(d) : null)}
              />
            ) : (
              !isToday(selectedDate) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDateParam(null)}
                >
                  Hoy
                </Button>
              )
            )}

            <Button
              aria-label="Período siguiente"
              size="icon-sm"
              variant="outline"
              onClick={() => goBy(1)}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
            </Button>
          </div>

          {calView !== "day" && (
            <span className="hidden text-sm font-medium capitalize sm:inline">
              {periodLabel}
            </span>
          )}

          <Button
            aria-label="Recargar citas"
            size="icon-sm"
            variant="ghost"
            onClick={() => refetch()}
          >
            <HugeiconsIcon icon={Refresh03Icon} strokeWidth={2} />
          </Button>
        </div>
      </div>

      {calView !== "day" && (
        <p className="text-sm font-medium capitalize sm:hidden">
          {periodLabel}
        </p>
      )}

      <Separator />

      {isLoading ? (
        <CalendarSkeleton view={calView} />
      ) : isError ? (
        <p className="text-sm text-destructive">
          Ha ocurrido un error al cargar las citas. Por favor, inténtalo de
          nuevo.
        </p>
      ) : (
        <>
          {calView === "day" && (
            <CalendarDayView
              date={selectedDate}
              apts={apts}
              onAptClick={openApt}
            />
          )}
          {calView === "week" && (
            <CalendarWeekView
              date={selectedDate}
              apts={apts}
              onAptClick={openApt}
              onDayClick={switchToDay}
            />
          )}
          {calView === "month" && (
            <CalendarMonthView
              date={selectedDate}
              apts={apts}
              onAptClick={openApt}
              onDayClick={switchToDay}
            />
          )}
        </>
      )}

      <AppointmentDetailModal
        appointment={selectedApt}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
