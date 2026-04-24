import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  LayoutRightIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { Appointment } from "@wappiz/api-client/types/appointments"
import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns"
import { es } from "date-fns/locale"
import { useCallback, useMemo, useState } from "react"

import { AppointmentDetailModal } from "@/components/appointments/appointment-detail-modal"
import {
  STATUS_ITEMS,
  WEEK_OPTS,
  toDateKey,
} from "@/components/appointments/calendar-config"
import { CalendarDayView } from "@/components/appointments/calendar-day-view"
import { CalendarMobileFilters } from "@/components/appointments/calendar-mobile-filters"
import { CalendarMonthView } from "@/components/appointments/calendar-month-view"
import { CalendarPeriodHeader } from "@/components/appointments/calendar-period-header"
import { CalendarSidebar } from "@/components/appointments/calendar-sidebar"
import { CalendarSkeleton } from "@/components/appointments/calendar-skeleton"
import { CalendarWeekView } from "@/components/appointments/calendar-week-view"
import { FilterSelect } from "@/components/appointments/filter-select"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCalendarData } from "@/hooks/use-calendar-data"
import { useCalendarUrl } from "@/hooks/use-calendar-url"
import { useIsMobile } from "@/hooks/use-mobile"

export function AppointmentsCalendar() {
  const {
    calView,
    from,
    resourceIds,
    selectedDate,
    serviceIds,
    setDateParam,
    setResourceIds,
    setServiceIds,
    setStatuses,
    setView,
    statuses,
    to,
  } = useCalendarUrl()

  const [selectedAptId, setSelectedAptId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)

  const {
    apts,
    isError,
    isLoading,
    isLoadingResources,
    isLoadingServices,
    resources,
    selectedApt,
    services,
  } = useCalendarData({
    calView,
    from,
    resourceIds,
    selectedAptId,
    serviceIds,
    statuses,
    to,
  })

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

  const openApt = useCallback((a: Appointment) => {
    setSelectedAptId(a.id)
    setDetailOpen(true)
  }, [])

  const switchToDay = useCallback(
    (d: Date) => {
      setDateParam(toDateKey(d))
      setView("day")
    },
    [setDateParam, setView]
  )

  const goBy = useCallback(
    (dir: 1 | -1) => {
      if (calView === "day") {
        setDateParam(
          toDateKey(
            dir === 1 ? addDays(selectedDate, 1) : subDays(selectedDate, 1)
          )
        )
      } else if (calView === "week") {
        setDateParam(
          toDateKey(
            dir === 1 ? addWeeks(selectedDate, 1) : subWeeks(selectedDate, 1)
          )
        )
      } else {
        setDateParam(
          toDateKey(
            dir === 1 ? addMonths(selectedDate, 1) : subMonths(selectedDate, 1)
          )
        )
      }
    },
    [calView, selectedDate, setDateParam]
  )

  return (
    <div className="-mb-16 flex h-[calc(100dvh-6rem)] flex-col gap-0 overflow-hidden">
      <CalendarPeriodHeader periodLabel={periodLabel} aptCount={apts.length} />

      <div className="flex flex-col gap-2 pb-3 md:flex-row md:items-center md:justify-between md:gap-1.5">
        <div className="flex items-center gap-1.5">
          <Tabs value={calView} onValueChange={(v) => setView(v)}>
            <TabsList>
              <TabsTrigger value="day">Día</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mes</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="hidden items-center gap-1.5 md:flex">
            <Separator orientation="vertical" className="h-5" />
            <FilterSelect
              isLoading={isLoadingResources}
              items={(resources ?? []).map((r) => ({
                id: r.id,
                label: r.name,
              }))}
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
        </div>

        <div className="flex items-center justify-between gap-1">
          <CalendarMobileFilters
            filterCount={resourceIds.length + serviceIds.length}
            isLoadingResources={isLoadingResources}
            isLoadingServices={isLoadingServices}
            resourceIds={resourceIds}
            resources={resources}
            serviceIds={serviceIds}
            services={services}
            statuses={statuses}
            onResourceIdsChange={setResourceIds}
            onServiceIdsChange={setServiceIds}
            onStatusesChange={setStatuses}
          />

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
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDateParam(null)}
              >
                Hoy
              </Button>
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

          <Button
            aria-label={sidebarOpen ? "Ocultar panel" : "Mostrar panel"}
            aria-pressed={sidebarOpen}
            size="icon-sm"
            variant={sidebarOpen ? "secondary" : "ghost"}
            onClick={() => setSidebarOpen((o) => !o)}
            className="hidden md:inline-flex"
          >
            <HugeiconsIcon icon={LayoutRightIcon} strokeWidth={2} />
          </Button>
        </div>
      </div>

      <Separator />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {isLoading && <CalendarSkeleton view={calView} />}

          {isError && (
            <p className="mt-6 text-sm text-destructive">
              Ha ocurrido un error al cargar las citas. Por favor, inténtalo de
              nuevo.
            </p>
          )}

          {!isLoading && !isError && (
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
        </div>

        {sidebarOpen && (
          <div className="hidden h-full md:block">
            <CalendarSidebar
              periodLabel={periodLabel}
              date={selectedDate}
              onDateChange={(d) => {
                setDateParam(toDateKey(d))
                if (calView !== "day") {
                  setView("day")
                }
              }}
              onAptClick={openApt}
              apts={apts}
            />
          </div>
        )}
      </div>

      <AppointmentDetailModal
        appointment={selectedApt}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
