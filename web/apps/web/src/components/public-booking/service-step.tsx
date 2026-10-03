import {
  Cancel01Icon,
  Clock01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { PublicService } from "@wappiz/api-client/types/public-booking"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { formatCurrency } from "@/lib/intl"

/**
 * Tenants with a short catalog see everything at once; past this many
 * services the list collapses and search becomes the faster path.
 */
const COLLAPSED_COUNT = 5

/** Customers rarely type accents ("depilacion" must find "Depilación"). */
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()

/**
 * Name matches come before description-only matches, since the name is what
 * the customer is most likely looking for. API order is kept within each group.
 */
function searchServices(services: PublicService[], query: string) {
  const needle = normalize(query.trim())
  const byName: PublicService[] = []
  const byDescription: PublicService[] = []

  for (const service of services) {
    if (normalize(service.name).includes(needle)) {
      byName.push(service)
    } else if (normalize(service.description).includes(needle)) {
      byDescription.push(service)
    }
  }

  return [...byName, ...byDescription]
}

/**
 * Owned by the booking flow so it survives this step unmounting: coming back
 * from a later step must land the customer where they left the catalog.
 */
export type CatalogView = {
  expanded: boolean
  query: string
}

export const initialCatalogView: CatalogView = { expanded: false, query: "" }

type Props = {
  currency: string
  onSelect: (service: PublicService) => void
  onViewChange: (view: CatalogView) => void
  services: PublicService[]
  view: CatalogView
}

export function ServiceStep({
  currency,
  onSelect,
  onViewChange,
  services,
  view,
}: Props) {
  const { expanded, query } = view
  const setQuery = (next: string) => onViewChange({ ...view, query: next })

  if (services.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Sin servicios disponibles</EmptyTitle>
          <EmptyDescription>
            Este negocio aún no tiene servicios para reservar en línea.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const collapsible = services.length > COLLAPSED_COUNT
  const searching = query.trim() !== ""
  const matches = searching ? searchServices(services, query) : services
  const visible =
    searching || expanded || !collapsible
      ? matches
      : services.slice(0, COLLAPSED_COUNT)
  const hiddenCount = matches.length - visible.length

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-medium">Elige un servicio</h2>

      {collapsible && (
        <InputGroup className="h-10">
          <InputGroupAddon>
            <HugeiconsIcon
              icon={Search01Icon}
              strokeWidth={2}
              aria-hidden="true"
            />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label="Buscar servicio"
            placeholder="Buscar servicio"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {searching && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="Limpiar búsqueda"
                onClick={() => setQuery("")}
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      )}

      <p aria-live="polite" className="sr-only">
        {searching &&
          `${matches.length} ${matches.length === 1 ? "servicio encontrado" : "servicios encontrados"}`}
      </p>

      {visible.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptyDescription>
              No encontramos servicios para «{query.trim()}».
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => setQuery("")}>
              Ver todos los servicios
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((service) => (
            <li key={service.id}>
              <ServiceOption
                currency={currency}
                onSelect={onSelect}
                service={service}
              />
            </li>
          ))}
        </ul>
      )}

      {hiddenCount > 0 && (
        <Button
          variant="ghost"
          className="self-center"
          onClick={() => onViewChange({ ...view, expanded: true })}
        >
          Ver todos los servicios ({services.length})
        </Button>
      )}
    </section>
  )
}

type ServiceOptionProps = {
  currency: string
  onSelect: (service: PublicService) => void
  service: PublicService
}

function ServiceOption({ currency, onSelect, service }: ServiceOptionProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(service)}
      className="flex w-full items-start justify-between gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="font-medium">{service.name}</span>
        {service.description !== "" && (
          <span className="text-sm text-muted-foreground">
            {service.description}
          </span>
        )}
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <HugeiconsIcon
            icon={Clock01Icon}
            strokeWidth={2}
            className="size-3.5"
            aria-hidden="true"
          />
          {service.durationMinutes} min
        </span>
      </span>
      <span className="shrink-0 font-medium tabular-nums">
        {formatCurrency(service.price, currency)}
      </span>
    </button>
  )
}
