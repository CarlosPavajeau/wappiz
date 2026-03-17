import { Tag01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { getServerApi } from "@/lib/server-api"

import { CreateServiceDialog } from "./_components/create-service-dialog"
import { ServiceCard } from "./_components/service-card"

export default async function ServicesPage() {
  const api = await getServerApi()
  const services = await api.services.list()

  const serviceCount = services.length
  const serviceLabel =
    serviceCount === 0
      ? "Sin servicios registrados"
      : `${serviceCount} ${serviceCount === 1 ? "servicio" : "servicios"}`

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-start justify-between gap-4 sm:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Servicios
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{serviceLabel}</p>
        </div>
        <div className="shrink-0">
          <CreateServiceDialog />
        </div>
      </div>

      <Separator />

      {serviceCount === 0 ? (
        <Empty className="border py-20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon
                icon={Tag01Icon}
                size={16}
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </EmptyMedia>
            <EmptyTitle>Sin servicios</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <EmptyDescription>
              Crea tu primer servicio para definir duración, precio y tiempo de
              buffer entre citas.
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  )
}
