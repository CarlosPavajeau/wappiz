import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  LayoutRightIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery } from "@tanstack/react-query"
import type { Appointment } from "@wappiz/api-client/types/appointments"
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
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
import {
  STATUS_ITEMS,
  WEEK_OPTS,
  toDateKey,
} from "@/components/appointments/calendar-config"
import type { CalView } from "@/components/appointments/calendar-config"
import { CalendarDayView } from "@/components/appointments/calendar-day-view"
import { CalendarMonthView } from "@/components/appointments/calendar-month-view"
import { CalendarSidebar } from "@/components/appointments/calendar-sidebar"
import { CalendarSkeleton } from "@/components/appointments/calendar-skeleton"
import { CalendarWeekView } from "@/components/appointments/calendar-week-view"
import { FilterSelect } from "@/components/appointments/filter-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIsMobile } from "@/hooks/use-mobile"
import { api } from "@/lib/client-api"
import { cn } from "@/lib/utils"

export function AppointmentsCalendar() {
  const [view, setView] = useQueryState(
    "view",
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
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)

  const calView: CalView = view === "week" || view === "month" ? view : "day"
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

  const { data, isError, isLoading } = useQuery({
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

  const dayStats = useMemo(() => {
    const count = apts.length
    return { count }
  }, [apts])

  const mobileFilterCount = resourceIds.length + serviceIds.length

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

  const selectedApt = useMemo(
    () =>
      selectedAptId
        ? ((data ?? []).find((a) => a.id === selectedAptId) ?? null)
        : null,
    [selectedAptId, data]
  )

  const openApt = (a: Appointment) => {
    setSelectedAptId(a.id)
    setDetailOpen(true)
  }

  const switchToDay = (d: Date) => {
    setDateParam(toDateKey(d))
    setView("day")
  }

  return (
    <div className="-mb-16 flex h-[calc(100dvh-6rem)] flex-col gap-0 overflow-hidden">
      <div className="flex items-center gap-2 pb-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] leading-none font-semibold tracking-tight text-foreground first-letter:capitalize">
                {periodLabel}
              </span>
            </div>
            <div className="mt-1 text-[12px] text-muted-foreground">
              {dayStats.count} {dayStats.count === 1 ? "cita" : "citas"}{" "}
              agendadas
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 pb-3 md:flex-row md:items-center md:justify-between md:gap-1.5">
        <div className="flex items-center gap-1.5">
          <Tabs value={calView} onValueChange={(v) => setView(v)}>
            <TabsList>
              <TabsTrigger value="day">Día</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mes</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Desktop filters — hidden on mobile */}
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
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="md:hidden"
                  aria-label="Abrir filtros"
                >
                  Filtros
                  {mobileFilterCount > 0 && (
                    <Badge
                      className="ml-0.5 h-4.5 min-w-4.5 rounded-sm px-1 py-px text-[0.625rem] leading-none"
                      variant="secondary"
                    >
                      {mobileFilterCount}
                    </Badge>
                  )}
                </Button>
              }
            />
            <SheetContent side="bottom" className="max-h-[85dvh]">
              <SheetHeader className="px-4 pt-4 pb-2">
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 overflow-y-auto px-4 pb-8">
                {!isLoadingResources && (resources ?? []).length > 0 && (
                  <section className="flex flex-col gap-3">
                    <h3 className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                      Recursos
                    </h3>
                    <ul className="flex flex-col gap-3">
                      {(resources ?? []).map((r) => (
                        <li key={r.id} className="flex items-center gap-2.5">
                          <Checkbox
                            id={`mobile-resource-${r.id}`}
                            checked={resourceIds.includes(r.id)}
                            onCheckedChange={(checked) => {
                              setResourceIds(
                                checked
                                  ? [...resourceIds, r.id]
                                  : resourceIds.filter((id) => id !== r.id)
                              )
                            }}
                          />
                          <label
                            htmlFor={`mobile-resource-${r.id}`}
                            className="cursor-pointer text-sm"
                          >
                            {r.name}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {!isLoadingServices && (services ?? []).length > 0 && (
                  <section className="flex flex-col gap-3">
                    <h3 className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                      Servicios
                    </h3>
                    <ul className="flex flex-col gap-3">
                      {(services ?? []).map((s) => (
                        <li key={s.id} className="flex items-center gap-2.5">
                          <Checkbox
                            id={`mobile-service-${s.id}`}
                            checked={serviceIds.includes(s.id)}
                            onCheckedChange={(checked) => {
                              setServiceIds(
                                checked
                                  ? [...serviceIds, s.id]
                                  : serviceIds.filter((id) => id !== s.id)
                              )
                            }}
                          />
                          <label
                            htmlFor={`mobile-service-${s.id}`}
                            className="cursor-pointer text-sm"
                          >
                            {s.name}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section className="flex flex-col gap-3">
                  <h3 className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                    Estado
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {STATUS_ITEMS.map((item) => (
                      <li key={item.id} className="flex items-center gap-2.5">
                        <Checkbox
                          id={`mobile-status-${item.id}`}
                          checked={statuses.includes(item.id)}
                          onCheckedChange={(checked) => {
                            setStatuses(
                              checked
                                ? [...statuses, item.id]
                                : statuses.filter((id) => id !== item.id)
                            )
                          }}
                        />
                        {item.color && (
                          <div
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              item.color
                            )}
                          />
                        )}
                        <label
                          htmlFor={`mobile-status-${item.id}`}
                          className="cursor-pointer text-sm"
                        >
                          {item.label}
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </SheetContent>
          </Sheet>

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
          {isLoading ? (
            <CalendarSkeleton view={calView} />
          ) : (isError ? (
            <p className="mt-6 text-sm text-destructive">
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
          ))}
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
