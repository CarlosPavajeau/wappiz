import { ArrowLeft01Icon, ServiceIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

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
import { getServerApi } from "@/lib/server-api"

import { LinkServicesDialog } from "./_components/link-services-dialog"
import { ResourceServiceCard } from "./_components/resource-service-card"
import { ScheduleOverridesCard } from "./_components/schedule-overrides-card"
import { WorkingHoursCard } from "./_components/working-hours-card"

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ setup?: string }>
}

export default async function ResourcePage({ params, searchParams }: Props) {
  const [{ id }, { setup }] = await Promise.all([params, searchParams])
  const api = await getServerApi()
  const [resource, services, allServices, overrides] = await Promise.all([
    api.resources.get(id),
    api.resources.services(id),
    api.services.list(),
    api.resources.listOverrides(id),
  ])

  const linkedServiceIds = services.map((s) => s.id)

  const initials = resource.name
    .split(" ")
    .slice(0, 2)
    .map((word: string) => word[0])
    .join("")
    .toUpperCase()

  const serviceCount = services.length
  const serviceLabel =
    serviceCount === 0
      ? "Sin servicios vinculados"
      : `${serviceCount} ${serviceCount === 1 ? "servicio vinculado" : "servicios vinculados"}`

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Back navigation */}
      <nav aria-label="Navegación de breadcrumb">
        <Link
          href="/dashboard/resources"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors duration-200"
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

      {/* Resource header */}
      <header className="flex items-start gap-4 sm:items-center">
        <div
          role="img"
          aria-label={`Avatar de ${resource.name}`}
          className="bg-primary/10 text-primary ring-primary/20 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold ring-1 sm:h-16 sm:w-16 sm:text-xl"
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {resource.name}
          </h1>
          <div className="mt-1.5">
            <Badge variant="secondary" className="text-xs capitalize">
              {resource.type}
            </Badge>
          </div>
        </div>
      </header>

      <Separator />

      {/* Main content */}
      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        {/* Schedule configuration sidebar */}
        <aside aria-label="Configuración de horario" className="space-y-5">
          <WorkingHoursCard
            resourceId={id}
            workingHours={resource.workingHours}
            defaultOpen={setup === "working-hours"}
          />
          <ScheduleOverridesCard resourceId={id} overrides={overrides} />
        </aside>

        {/* Assigned services section */}
        <section aria-labelledby="services-heading" className="space-y-5">
          <div className="flex items-start justify-between gap-4 sm:items-center">
            <div className="min-w-0">
              <h2
                id="services-heading"
                className="text-base font-semibold leading-snug"
              >
                Servicios asignados
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {serviceLabel}
              </p>
            </div>
            <div className="shrink-0">
              <LinkServicesDialog
                resourceId={id}
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
            <div className="grid gap-3 sm:grid-cols-2">
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
