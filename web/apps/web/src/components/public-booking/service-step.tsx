import { Clock01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { PublicService } from "@wappiz/api-client/types/public-booking"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { formatCurrency } from "@/lib/intl"

type Props = {
  currency: string
  onSelect: (service: PublicService) => void
  services: PublicService[]
}

export function ServiceStep({ currency, onSelect, services }: Props) {
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

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-medium">Elige un servicio</h2>
      <ul className="flex flex-col gap-2">
        {services.map((service) => (
          <li key={service.id}>
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
          </li>
        ))}
      </ul>
    </section>
  )
}
