import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { getServerApi } from "@/lib/server-api"

import { LinkServicesDialog } from "./_components/link-services-dialog"
import { ResourceServiceCard } from "./_components/resource-service-card"
import { WorkingHoursCard } from "./_components/working-hours-card"

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ setup?: string }>
}

export default async function ResourcePage({ params, searchParams }: Props) {
  const [{ id }, { setup }] = await Promise.all([params, searchParams])
  const api = await getServerApi()
  const [resource, services, allServices] = await Promise.all([
    api.resources.get(id),
    api.resources.services(id),
    api.services.list(),
  ])

  const linkedServiceIds = services.map((s) => s.id)

  const initials = resource.name
    .split(" ")
    .slice(0, 2)
    .map((word: string) => word[0])
    .join("")
    .toUpperCase()

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Link
          href="/dashboard/resources"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Recursos
        </Link>

        <div className="flex items-center gap-4">
          <div
            role="img"
            aria-label={resource.name}
            className="bg-primary/10 text-primary flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold"
          >
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {resource.name}
            </h1>
            <Badge variant="outline" className="mt-1 capitalize lowercase">
              {resource.type}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <WorkingHoursCard
          resourceId={id}
          workingHours={resource.workingHours}
          defaultOpen={setup === "working-hours"}
        />

        <section aria-labelledby="services-heading" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2
              id="services-heading"
              className="text-base font-medium leading-snug"
            >
              Servicios asignados
              <span className="text-muted-foreground ml-2 font-normal">
                ({services.length})
              </span>
            </h2>
            <LinkServicesDialog
              resourceId={id}
              allServices={allServices}
              linkedServiceIds={linkedServiceIds}
            />
          </div>

          {services.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay servicios asignados a este recurso.
            </p>
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
