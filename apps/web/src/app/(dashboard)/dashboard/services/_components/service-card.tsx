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

const priceFormatter = new Intl.NumberFormat("es-CO", {
  currency: "COP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
})

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Card>
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
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
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

          <div className="col-span-2">
            <dt className="text-muted-foreground">Total por cita</dt>
            <dd className="font-medium tabular-nums">
              {service.totalMinutes} min
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
