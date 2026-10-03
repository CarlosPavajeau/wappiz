import { ArrowLeft01Icon, Refresh03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery } from "@tanstack/react-query"
import type {
  AvailableSlot,
  PublicService,
  PublicTenant,
} from "@wappiz/api-client/types/public-booking"
import { addDays, isSameDay } from "date-fns"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { formatTimeIn, hourIn, todayIn, toDateKey } from "@/lib/time-zone"
import { cn } from "@/lib/utils"
import { publicAvailabilityQuery } from "@/queries/public-booking"

import { resourcesFor } from "./resources"

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
  const resources = resourcesFor(tenant, service)
  const resource = resources.find(({ id }) => id === selection.resourceId)
  const today = todayIn(tenant.timezone)
  const days = Array.from({ length: tenant.bookingWindowDays + 1 }, (_, i) =>
    addDays(today, i)
  )
  const dateKey = toDateKey(selection.day)

  const {
    data: slots,
    isError,
    isFetching,
    isPending,
    refetch,
  } = useQuery(
    publicAvailabilityQuery({
      date: dateKey,
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
          aria-label="Volver"
          onClick={onBack}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
        </Button>
        <div className="flex min-w-0 flex-col">
          <h2 className="text-base font-medium">
            {service.name}: elige fecha y hora
          </h2>
          {resource !== undefined && (
            <p className="truncate text-sm text-muted-foreground">
              Con {resource.name}
            </p>
          )}
        </div>
      </div>

      <DayStrip
        days={days}
        onSelect={(day) => onSelectionChange({ ...selection, day })}
        selected={selection.day}
        today={today}
      />

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Horarios disponibles</h3>
        <SlotList
          // A new day starts on its own first available part of the day.
          key={dateKey}
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

const weekdayFormatter = new Intl.DateTimeFormat("es-CO", { weekday: "short" })
const monthFormatter = new Intl.DateTimeFormat("es-CO", { month: "short" })
const fullDateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  weekday: "long",
})

type DayStripProps = {
  days: Date[]
  onSelect: (day: Date) => void
  selected: Date
  today: Date
}

/**
 * A horizontally scrolling row of days: unlike a month grid it fits any
 * screen width and keeps every target thumb-sized.
 */
function DayStrip({ days, onSelect, selected, today }: DayStripProps) {
  const selectedRef = useRef<HTMLButtonElement>(null)

  // Coming back from the details step can land on a day far down the strip.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", inline: "center" })
  }, [])

  return (
    <fieldset className="-mx-4 flex min-w-0 snap-x scroll-px-4 [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1">
      {days.map((day) => {
        const isSelected = isSameDay(day, selected)
        return (
          <button
            key={day.getTime()}
            ref={isSelected ? selectedRef : undefined}
            type="button"
            aria-pressed={isSelected}
            aria-label={fullDateFormatter.format(day)}
            onClick={() => onSelect(day)}
            className={cn(
              "flex w-14 shrink-0 snap-start flex-col items-center gap-0.5 rounded-lg border py-2 transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:bg-muted"
            )}
          >
            <span className="text-[11px] font-medium uppercase">
              {isSameDay(day, today) ? "Hoy" : weekdayFormatter.format(day)}
            </span>
            <span className="text-lg leading-none font-semibold tabular-nums">
              {day.getDate()}
            </span>
            <span
              className={cn(
                "text-[11px]",
                !isSelected && "text-muted-foreground"
              )}
            >
              {monthFormatter.format(day)}
            </span>
          </button>
        )
      })}
    </fieldset>
  )
}

/** Hours are read on the business's wall clock; `to` is exclusive. */
const DAY_PARTS = [
  { from: 0, id: "morning", label: "Mañana", to: 12 },
  { from: 12, id: "afternoon", label: "Tarde", to: 18 },
  { from: 18, id: "evening", label: "Noche", to: 24 },
] as const

type DayPart = (typeof DAY_PARTS)[number]["id"]

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
  /** `null` until the customer picks, meaning "first part with slots" */
  const [chosenPart, setChosenPart] = useState<DayPart | null>(null)

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
        {Array.from({ length: 6 }, (_, i) => (
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

  const parts = DAY_PARTS.map((part) => ({
    ...part,
    slots: options.filter((slot) => {
      const hour = hourIn(slot.startsAt, timeZone)
      return hour >= part.from && hour < part.to
    }),
  }))
  const activePart =
    parts.find(({ id }) => id === chosenPart) ??
    parts.find((part) => part.slots.length > 0)

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex gap-2">
        <legend className="sr-only">Momento del día</legend>
        {parts.map((part) => (
          <ChoiceChip
            key={part.id}
            disabled={part.slots.length === 0}
            onClick={() => setChosenPart(part.id)}
            selected={part.id === activePart?.id}
          >
            {part.label}
            <span className="ml-1 tabular-nums opacity-70">
              {part.slots.length}
            </span>
          </ChoiceChip>
        ))}
      </fieldset>

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {activePart?.slots.map((slot) => (
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
    </div>
  )
}

type ChoiceChipProps = {
  children: React.ReactNode
  disabled: boolean
  onClick: () => void
  selected: boolean
}

function ChoiceChip({
  children,
  disabled,
  onClick,
  selected,
}: ChoiceChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
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
