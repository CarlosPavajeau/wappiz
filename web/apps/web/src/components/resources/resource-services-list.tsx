import { ServiceIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { Service } from "@wappiz/api-client/types/services"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

const priceFormatter = new Intl.NumberFormat("es-MX", {
  currency: "MXN",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
})

function formatDuration(service: Service) {
  if (service.bufferMinutes > 0) {
    return `${service.durationMinutes} min · ${service.bufferMinutes} min buffer`
  }
  return `${service.durationMinutes} min`
}

type Props = {
  services: Service[]
}

export function ResourceServicesList({ services }: Props) {
  if (services.length === 0) {
    return (
      <Empty className="border py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon
              icon={ServiceIcon}
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </EmptyMedia>
          <EmptyTitle>Sin servicios asignados</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <EmptyDescription>
            Vincula servicios a este recurso para que puedan ser agendados.
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <ul className="divide-y">
      {services.map((service) => (
        <li
          key={service.id}
          className="flex items-start justify-between gap-3 py-2.5"
        >
          <div className="min-w-0 space-y-0.5">
            <p className="truncate text-sm font-medium" title={service.name}>
              {service.name}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatDuration(service)}
            </p>
          </div>
          <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
            {priceFormatter.format(service.price)}
          </span>
        </li>
      ))}
    </ul>
  )
}
