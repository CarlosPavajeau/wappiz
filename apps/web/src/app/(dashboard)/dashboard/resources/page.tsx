import { getServerApi } from "@/lib/server-api"

import { CreateResourceDialog } from "./_components/create-resource-dialog"
import { ResourceCard } from "./_components/resource-card"

export default async function ResourcesPage() {
  const api = await getServerApi()
  const resources = await api.resources.list()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recursos</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {resources.length === 0
              ? "No hay recursos registrados"
              : `${resources.length} ${resources.length === 1 ? "recurso" : "recursos"}`}
          </p>
        </div>
        <CreateResourceDialog />
      </div>

      {resources.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  )
}
