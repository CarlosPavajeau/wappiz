import {
  ArrowDown01Icon,
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
import { useCallback, useEffect, useMemo, useState } from "react"

import { AppointmentDetailModal } from "@/components/appointments/appointment-detail-modal"
import {
  STATUS_ITEMS,
  WEEK_OPTS,
  toDateKey,
} from "@/components/appointments/calendar-config"
import { CalendarDayView } from "@/components/appointments/calendar-day-view"
import { CalendarMobileFilters } from "@/components/appointments/calendar-mobile-filters"
import { CalendarMonthView } from "@/components/appointments/calendar-month-view"
import { CalendarSidebar } from "@/components/appointments/calendar-sidebar"
import { CalendarSkeleton } from "@/components/appointments/calendar-skeleton"
import { CalendarWeekView } from "@/components/appointments/calendar-week-view"
import { FilterSelect } from "@/components/appointments/filter-select"
import { ScheduleAppointmentDialog } from "@/components/appointments/schedule-appointment-dialog"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCalendarData } from "@/hooks/use-calendar-data"
import { useCalendarUrl } from "@/hooks/use-calendar-url"
import { useIsMobile } from "@/hooks/use-mobile"

export function AppointmentsCalendar() {
  const {
    aptId,
    calView,
    from,
    resourceIds,
    selectedDate,
    serviceIds,
    setAptId,
    setDateParam,
    setResourceIds,
    setServiceIds,
    setStatuses,
    setView,
    statuses,
    to,
  } = useCalendarUrl()

  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const [pickerOpen, setPickerOpen] = useState(false)

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
    selectedAptId: aptId,
    serviceIds,
    statuses,
    to,
  })

  // Clear the apt param when the loaded data can't resolve it (e.g. the
  // appointment moved to a status excluded by the active filters)
  useEffect(() => {
    if (aptId && !(isLoading || isError) && selectedApt === null) {
      setAptId(null)
    }
  }, [aptId, isLoading, isError, selectedApt, setAptId])

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

  const openApt = useCallback(
    (a: Appointment) => {
      setAptId(a.id)
    },
    [setAptId]
  )

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
      <div className="flex flex-col gap-2 pb-3">
        <div className="flex items-center gap-1">
          <Button
            aria-label="Período anterior"
            size="icon-sm"
            variant="outline"
            onClick={() => goBy(-1)}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          </Button>
          <Button
            aria-label="Período siguiente"
            size="icon-sm"
            variant="outline"
            onClick={() => goBy(1)}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="hidden sm:inline-flex"
            onClick={() => setDateParam(null)}
          >
            Hoy
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-1.5 max-sm:pr-2">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger
                render={<Button size="sm" variant="ghost" />}
                className="min-w-0 px-2"
              >
                <span className="truncate text-[15px] font-semibold tracking-tight first-letter:capitalize">
                  {periodLabel}
                </span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  strokeWidth={2}
                  data-icon="inline-end"
                  className="text-muted-foreground"
                />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  autoFocus
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (d) {
                      setDateParam(toDateKey(d))
                      setPickerOpen(false)
                    }
                  }}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
            <span className="hidden text-xs whitespace-nowrap text-muted-foreground lg:inline">
              {apts.length} {apts.length === 1 ? "cita" : "citas"} agendadas
            </span>
          </div>

          <ScheduleAppointmentDialog
            defaultDate={selectedDate}
            isLoadingResources={isLoadingResources}
            isLoadingServices={isLoadingServices}
            resources={resources}
            services={services}
          />

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

        <div className="flex items-center justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
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
                items={(services ?? []).map((s) => ({
                  id: s.id,
                  label: s.name,
                }))}
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
        open={selectedApt !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAptId(null)
          }
        }}
      />
    </div>
  )
}
