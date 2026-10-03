import { ArrowLeft01Icon, Refresh03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery } from "@tanstack/react-query"
import type {
  AvailableSlot,
  PublicService,
  PublicTenant,
} from "@wappiz/api-client/types/public-booking"
import { addDays } from "date-fns"
import { es } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { formatTimeIn, todayIn, toDateKey } from "@/lib/time-zone"
import { cn } from "@/lib/utils"
import { publicAvailabilityQuery } from "@/queries/public-booking"

export type SlotSelection = {
  /** Calendar day in the business's timezone (local-midnight `Date`) */
  day: Date
  /** `null` books whichever resource is free */
  resourceId: string | null
}

type Props = {
  onBack: () => void
  onPick: (slot: AvailableSlot) => void
  onSelectionChange: (selection: SlotSelection) => void
  selection: SlotSelection
  service: PublicService
  tenant: PublicTenant
}

export function SlotStep({
  onBack,
  onPick,
  onSelectionChange,
  selection,
  service,
  tenant,
}: Props) {
  const resources = tenant.resources.filter((resource) =>
    resource.serviceIds.includes(service.id)
  )
  const today = todayIn(tenant.timezone)
  const lastDay = addDays(today, tenant.bookingWindowDays)

  const {
    data: slots,
    isError,
    isFetching,
    isPending,
    refetch,
  } = useQuery(
    publicAvailabilityQuery({
      date: toDateKey(selection.day),
      resourceId: selection.resourceId ?? undefined,
      serviceId: service.id,
      slug: tenant.slug,
    })
  )

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Volver a servicios"
          onClick={onBack}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
        </Button>
        <h2 className="text-base font-medium">
          {service.name}: elige fecha y hora
        </h2>
      </div>

      {resources.length > 1 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">¿Con quién?</legend>
          <div className="flex flex-wrap gap-2">
            <ChoiceChip
              selected={selection.resourceId === null}
              onClick={() =>
                onSelectionChange({ ...selection, resourceId: null })
              }
            >
              Cualquiera disponible
            </ChoiceChip>
            {resources.map((resource) => (
              <ChoiceChip
                key={resource.id}
                selected={selection.resourceId === resource.id}
                onClick={() =>
                  onSelectionChange({ ...selection, resourceId: resource.id })
                }
              >
                {resource.name}
              </ChoiceChip>
            ))}
          </div>
        </fieldset>
      )}

      <Calendar
        mode="single"
        required
        locale={es}
        selected={selection.day}
        onSelect={(day) => onSelectionChange({ ...selection, day })}
        disabled={[{ before: today }, { after: lastDay }]}
        startMonth={today}
        endMonth={lastDay}
        className="mx-auto rounded-lg border [--cell-size:--spacing(10)]"
      />

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Horarios disponibles</h3>
        <SlotList
          isError={isError}
          isFetching={isFetching}
          isPending={isPending}
          onPick={onPick}
          onRetry={() => refetch()}
          showResource={selection.resourceId === null && resources.length > 1}
          slots={slots}
          timeZone={tenant.timezone}
        />
      </div>
    </section>
  )
}

type SlotListProps = {
  isError: boolean
  isFetching: boolean
  isPending: boolean
  onPick: (slot: AvailableSlot) => void
  onRetry: () => void
  showResource: boolean
  slots: AvailableSlot[] | undefined
  timeZone: string
}

function SlotList({
  isError,
  isFetching,
  isPending,
  onPick,
  onRetry,
  showResource,
  slots,
  timeZone,
}: SlotListProps) {
  if (isError) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2">
        <p className="text-sm text-destructive">
          No pudimos cargar los horarios.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isFetching}
          onClick={onRetry}
        >
          {isFetching ? (
            <Spinner />
          ) : (
            <HugeiconsIcon
              icon={Refresh03Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
          )}
          Reintentar
        </Button>
      </div>
    )
  }

  if (isPending || slots === undefined) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    )
  }

  const options = firstSlotPerStart(slots)
  if (options.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
        No hay horarios disponibles este día. Prueba con otra fecha.
      </p>
    )
  }

  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {options.map((slot) => (
        <li key={slot.startsAt}>
          <Button
            type="button"
            variant="outline"
            className="h-auto w-full flex-col gap-0 py-2 tabular-nums"
            onClick={() => onPick(slot)}
          >
            {formatTimeIn(slot.startsAt, timeZone)}
            {showResource && (
              <span className="max-w-full truncate text-[11px] font-normal text-muted-foreground">
                {slot.resourceName}
              </span>
            )}
          </Button>
        </li>
      ))}
    </ul>
  )
}

type ChoiceChipProps = {
  children: React.ReactNode
  onClick: () => void
  selected: boolean
}

function ChoiceChip({ children, onClick, selected }: ChoiceChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card hover:bg-muted"
      )}
    >
      {children}
    </button>
  )
}

/**
 * With "any resource" the API returns one slot per free resource at each
 * time. The customer only cares about the time, so keep the first resource
 * (the API orders ties by the business's resource order).
 */
function firstSlotPerStart(slots: AvailableSlot[]): AvailableSlot[] {
  const seen = new Set<string>()
  return slots.filter((slot) => {
    if (seen.has(slot.startsAt)) {
      return false
    }
    seen.add(slot.startsAt)
    return true
  })
}
