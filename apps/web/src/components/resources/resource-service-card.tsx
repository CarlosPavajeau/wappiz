import type { Service } from "@wappiz/api-client/types/services"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const priceFormatter = new Intl.NumberFormat("es-MX", {
  currency: "MXN",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
})

type Props = {
  service: Service
}

export function ResourceServiceCard({ service }: Props) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle className="truncate">{service.name}</CardTitle>
          {service.description && (
            <CardDescription className="mt-0.5 line-clamp-2">
              {service.description}
            </CardDescription>
          )}
        </div>
        <CardAction>
          <Badge variant="secondary">
            {priceFormatter.format(service.price)}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent>
        <dl className="grid grid-cols-3 gap-x-2 text-sm sm:gap-x-4">
          <div>
            <dt className="text-muted-foreground">Duración</dt>
            <dd className="font-medium tabular-nums">
              {service.durationMinutes} min
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Buffer</dt>
            <dd className="font-medium tabular-nums">
              {service.bufferMinutes > 0 ? `${service.bufferMinutes} min` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-medium tabular-nums">
              {service.totalMinutes} min
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
