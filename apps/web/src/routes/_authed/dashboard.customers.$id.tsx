import {
  ArrowLeft01Icon,
  Calendar01Icon,
  Cancel01Icon,
  FileNotFoundIcon,
  PhoneCall,
  UserRemove01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { DefaultLoader } from "@/components/default-loader"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/lib/client-api"
import { cn } from "@/lib/utils"

type IncidentType = "no_show" | "late_cancel"

type Incident = {
  id: string
  date: string
  service: string
  resource: string
  type: IncidentType
  note: string | null
}

const MOCK_INCIDENTS: Incident[] = [
  {
    id: "1",
    date: "2025-03-15T10:00:00",
    service: "Corte de cabello",
    resource: "Carlos M.",
    type: "no_show",
    note: null,
  },
  {
    id: "2",
    date: "2025-02-28T14:30:00",
    service: "Tinte completo",
    resource: "Ana R.",
    type: "late_cancel",
    note: "Canceló 1 hora antes",
  },
  {
    id: "3",
    date: "2025-01-12T09:00:00",
    service: "Manicure y pedicure",
    resource: "Laura S.",
    type: "no_show",
    note: null,
  },
  {
    id: "4",
    date: "2024-12-05T11:00:00",
    service: "Barba y bigote",
    resource: "Carlos M.",
    type: "late_cancel",
    note: "Canceló 30 minutos antes",
  },
]

const INCIDENT_CONFIG: Record<
  IncidentType,
  { label: string; className: string; icon: typeof Cancel01Icon }
> = {
  late_cancel: {
    className: "bg-red-500/10 text-red-700 dark:text-red-400",
    icon: Cancel01Icon,
    label: "Cancelación tardía",
  },
  no_show: {
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    icon: UserRemove01Icon,
    label: "No se presentó",
  },
}

export const Route = createFileRoute("/_authed/dashboard/customers/$id")({
  component: RouteComponent,
})

function IncidentTypeBadge({ type }: { type: IncidentType }) {
  const { label, className, icon } = INCIDENT_CONFIG[type]
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap",
        className
      )}
    >
      <HugeiconsIcon className="size-3!" icon={icon} strokeWidth={2} aria-hidden />
      {label}
    </span>
  )
}

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: customer, isLoading } = useQuery({
    queryFn: () => api.customers.byId(id),
    queryKey: ["customer", id],
  })

  if (isLoading) {
    return <DefaultLoader />
  }

  if (!customer) {
    return (
      <Empty className="w-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={FileNotFoundIcon} aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Cliente no encontrado</EmptyTitle>
          <EmptyDescription>
            El cliente solicitado no existe o no se encontró.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const initials = (customer.displayName || customer.name)
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()

  const hasIncidents = MOCK_INCIDENTS.length > 0

  return (
    <div className="space-y-6 sm:space-y-8">
      <nav aria-label="Navegación de breadcrumb">
        <Link
          to="/dashboard/customers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            size={14}
            strokeWidth={2}
            aria-hidden="true"
          />
          Clientes
        </Link>
      </nav>

      <header className="flex items-start gap-4 sm:items-center">
        <Avatar size="lg" aria-label={`Avatar de ${customer.displayName}`}>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {customer.displayName}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <HugeiconsIcon
                icon={PhoneCall}
                size={13}
                strokeWidth={2}
                aria-hidden="true"
              />
              {customer.phoneNumber}
            </span>
            {customer.displayName !== customer.name && (
              <>
                <span aria-hidden className="text-muted-foreground/40">
                  ·
                </span>
                <span className="text-sm text-muted-foreground">
                  {customer.name}
                </span>
              </>
            )}
            {customer.isBlocked ? (
              <Badge variant="destructive">Bloqueado</Badge>
            ) : (
              <Badge variant="outline">Activo</Badge>
            )}
          </div>
        </div>
      </header>

      <Separator />

      <dl className="grid grid-cols-3 divide-x divide-border rounded-lg border">
        <div className="flex flex-col gap-0.5 px-4 py-3 sm:px-6 sm:py-4">
          <dt className="text-xs text-muted-foreground">Total citas</dt>
          <dd className="text-2xl font-semibold tabular-nums">12</dd>
        </div>
        <div className="flex flex-col gap-0.5 px-4 py-3 sm:px-6 sm:py-4">
          <dt className="text-xs text-muted-foreground">No shows</dt>
          <dd
            className={cn(
              "text-2xl font-semibold tabular-nums",
              customer.noShowCount > 0 &&
                "text-amber-600 dark:text-amber-400"
            )}
          >
            {customer.noShowCount}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 px-4 py-3 sm:px-6 sm:py-4">
          <dt className="text-xs text-muted-foreground">Cancel. tardías</dt>
          <dd
            className={cn(
              "text-2xl font-semibold tabular-nums",
              customer.lateCancelCount > 0 && "text-red-600 dark:text-red-400"
            )}
          >
            {customer.lateCancelCount}
          </dd>
        </div>
      </dl>

      <Separator />

      <section aria-labelledby="incidents-heading">
        <div className="mb-5">
          <h2
            id="incidents-heading"
            className="text-base font-semibold leading-snug"
          >
            Incidencias
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {hasIncidents
              ? `${MOCK_INCIDENTS.length} incidencias registradas`
              : "Sin incidencias registradas"}
          </p>
        </div>

        {hasIncidents ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead className="hidden sm:table-cell">Recurso</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="hidden md:table-cell">Nota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_INCIDENTS.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {format(new Date(incident.date), "d MMM yyyy", {
                          locale: es,
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(incident.date), "h:mm a")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {incident.service}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {incident.resource}
                  </TableCell>
                  <TableCell>
                    <IncidentTypeBadge type={incident.type} />
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {incident.note ?? (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Empty className="border py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon
                  icon={Calendar01Icon}
                  size={16}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </EmptyMedia>
              <EmptyTitle>Sin incidencias</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </div>
  )
}
