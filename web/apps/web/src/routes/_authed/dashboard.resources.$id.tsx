import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { type } from "arktype"

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { LinkServicesDialog } from "@/components/resources/link-services-dialog"
import { ResourceServicesList } from "@/components/resources/resource-services-list"
import { ScheduleOverridesCard } from "@/components/resources/schedule-overrides-card"
import { UpdateResourceDialog } from "@/components/resources/update-resource-dialog"
import { WorkingHoursCard } from "@/components/resources/working-hours-card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { api } from "@/lib/client-api"
import { cn } from "@/lib/utils"
import {
  getResourceQuery,
  listResourceOverridesQuery,
  listResourcesQuery,
  listResourceServicesQuery,
} from "@/queries/resources"
import { listServicesQuery } from "@/queries/services"

const searchSchema = type({
  "setup?": "string",
})

export const Route = createFileRoute("/_authed/dashboard/resources/$id")({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    const { setup } = search
    return {
      setup,
    }
  },
  loader: async ({ params, context }) => {
    const { id } = params
    const { setup, queryClient } = context

    const [resource, services, allServices, overrides] = await Promise.all([
      queryClient.query({ ...getResourceQuery(id), staleTime: "static" }),
      queryClient.query({
        ...listResourceServicesQuery(id),
        staleTime: "static",
      }),
      queryClient.query({ ...listServicesQuery, staleTime: "static" }),
      queryClient.query({
        ...listResourceOverridesQuery(id),
        staleTime: "static",
      }),
    ])

    return {
      allServices,
      overrides,
      resource,
      services,
      setup,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { setup } = Route.useSearch()
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: resource } = useSuspenseQuery(getResourceQuery(id))
  const { data: services } = useSuspenseQuery(listResourceServicesQuery(id))
  const { data: allServices } = useSuspenseQuery(listServicesQuery)
  const { data: overrides } = useSuspenseQuery(listResourceOverridesQuery(id))

  const linkedServiceIds = services.map((s) => s.id)

  const initials = resource.name
    .split(" ")
    .slice(0, 2)
    .map((word: string) => word[0])
    .join("")
    .toUpperCase()

  const todayDayOfWeek = new Date().getDay()

  const serviceCount = services.length
  const serviceLabel =
    serviceCount === 0
      ? "Sin servicios vinculados"
      : `${serviceCount} ${serviceCount === 1 ? "servicio vinculado" : "servicios vinculados"}`

  return (
    <div className="space-y-6 sm:space-y-8">
      <nav aria-label="Navegación de breadcrumb">
        <Link
          to="/dashboard/resources"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            size={14}
            strokeWidth={2}
            aria-hidden="true"
          />
          Recursos
        </Link>
      </nav>

      <header className="flex items-start gap-4 sm:items-center">
        <Avatar size="lg" aria-label={`Avatar de ${resource.name}`}>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1
            className="line-clamp-2 text-xl font-semibold tracking-tight sm:text-2xl"
            title={resource.name}
          >
            {resource.name}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-xs capitalize">
              {resource.type}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                resource.isActive
                  ? "border-primary/30 text-primary"
                  : "text-muted-foreground"
              )}
            >
              {resource.isActive ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <UpdateResourceDialog
            resourceId={resource.id}
            defaultValues={resource}
          />
          <ConfirmDeleteDialog
            entity="recurso"
            name={resource.name}
            onDelete={() => api.resources.delete(resource.id)}
            onDeleted={async () => {
              // The list loader reads with staleTime "static", so invalidating
              // would still serve the cached list; removing it makes the
              // loader fetch a list without this resource. exact keeps the
              // ["resources"] prefix from matching this page's queries.
              queryClient.removeQueries({
                queryKey: listResourcesQuery.queryKey,
                exact: true,
              })
              await navigate({ to: "/dashboard/resources" })
              // Dropped only after leaving, so the page never refetches a
              // resource that no longer exists. Without exact this also
              // drops its services and overrides.
              queryClient.removeQueries({
                queryKey: getResourceQuery(resource.id).queryKey,
              })
            }}
          />
        </div>
      </header>

      <Separator />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
        <section
          aria-label="Disponibilidad del recurso"
          className="grid content-start gap-5 xl:grid-cols-2"
        >
          <WorkingHoursCard
            resourceId={resource.id}
            workingHours={resource.workingHours}
            defaultOpen={setup === "working-hours"}
            todayDayOfWeek={todayDayOfWeek}
          />
          <ScheduleOverridesCard
            resourceId={resource.id}
            overrides={overrides}
          />
        </section>

        <aside aria-labelledby="services-heading" className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                id="services-heading"
                className="text-base leading-snug font-semibold"
              >
                Servicios
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {serviceLabel}
              </p>
            </div>
            <div className="shrink-0">
              <LinkServicesDialog
                resourceId={resource.id}
                allServices={allServices}
                linkedServiceIds={linkedServiceIds}
              />
            </div>
          </div>

          <ResourceServicesList services={services} />
        </aside>
      </div>
    </div>
  )
}
