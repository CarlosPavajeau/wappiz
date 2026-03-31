import { User02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { createFileRoute } from "@tanstack/react-router"

import { CreateResourceDialog } from "@/components/resources/create-resource-dialog"
import { ResourceCard } from "@/components/resources/resource-card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { api } from "@/lib/client-api"

export const Route = createFileRoute("/_authed/dashboard/resources/")({
  component: RouteComponent,
  loader: async () => {
    const resources = await api.resources.list()
    return {
      resources,
    }
  },
})

function RouteComponent() {
  const { resources } = Route.useLoaderData()
  const resourceCount = resources.length
  const resourceLabel =
    resourceCount === 0
      ? "Sin recursos registrados"
      : `${resourceCount} ${resourceCount === 1 ? `recurso` : `recursos`}`

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-start justify-between gap-4 sm:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Recursos
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{resourceLabel}</p>
        </div>
        <div className="shrink-0">
          <CreateResourceDialog />
        </div>
      </div>

      <Separator />

      {resourceCount === 0 ? (
        <Empty className="border py-20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon
                icon={User02Icon}
                size={16}
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </EmptyMedia>
            <EmptyTitle>Sin recursos</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <EmptyDescription>
              Crea tu primer recurso para comenzar a gestionar disponibilidad y
              servicios.
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  )
}
