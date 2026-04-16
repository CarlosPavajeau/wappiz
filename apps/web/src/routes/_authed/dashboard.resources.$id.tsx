import { ArrowLeft01Icon, ServiceIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { type } from "arktype"

import { LinkServicesDialog } from "@/components/resources/link-services-dialog"
import { ResourceServiceCard } from "@/components/resources/resource-service-card"
import { ScheduleOverridesCard } from "@/components/resources/schedule-overrides-card"
import { UpdateResourceDialog } from "@/components/resources/update-resource-dialog"
import { WorkingHoursCard } from "@/components/resources/working-hours-card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"

const searchSchema = type({
  "setup?": "string",
})

export const Route = createFileRoute("/_authed/dashboard/resources/$id")({
  beforeLoad: ({ search }) => {
    const { setup } = search
    return {
      setup,
    }
  },
  component: RouteComponent,
  loader: async ({ params, context }) => {
    const { id } = params
    const { setup } = context

    const [resource, services, allServices, overrides] = await Promise.all([
      api.resources.get(id),
      api.resources.services(id),
      api.services.list(),
      api.resources.listOverrides(id),
    ])

    return {
      allServices,
      overrides,
      resource,
      services,
      setup,
    }
  },
  validateSearch: searchSchema,
})

function RouteComponent() {
  const { allServices, overrides, resource, services, setup } =
    Route.useLoaderData()

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
        <div className="shrink-0">
          <UpdateResourceDialog
            resourceId={resource.id}
            defaultValues={{
              avatarURL: resource.avatarUrl,
              name: resource.name,
              type: resource.type,
            }}
          />
        </div>
      </header>

      <Separator />

      <div className="grid gap-8 md:grid-cols-[220px_1fr] lg:grid-cols-[300px_1fr]">
        <aside aria-label="Configuración de horario" className="space-y-5">
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
        </aside>

        <section aria-labelledby="services-heading" className="space-y-5">
          <div className="flex items-start justify-between gap-4 sm:items-center">
            <div className="min-w-0">
              <h2
                id="services-heading"
                className="text-base leading-snug font-semibold"
              >
                Servicios asignados
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

          {serviceCount === 0 ? (
            <Empty className="border py-14">
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
                  Vincula servicios a este recurso para que puedan ser
                  agendados.
                </EmptyDescription>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => (
                <ResourceServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
