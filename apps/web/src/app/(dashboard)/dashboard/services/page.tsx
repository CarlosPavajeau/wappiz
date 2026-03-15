import { getServerApi } from "@/lib/server-api"

import { CreateServiceDialog } from "./_components/create-service-dialog"
import { ServiceCard } from "./_components/service-card"

export default async function ServicesPage() {
  const api = await getServerApi()
  const services = await api.services.list()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Servicios</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {services.length === 0
              ? "No hay servicios registrados"
              : `${services.length} ${services.length === 1 ? "servicio" : "servicios"}`}
          </p>
        </div>
        <CreateServiceDialog />
      </div>

      {services.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  )
}
