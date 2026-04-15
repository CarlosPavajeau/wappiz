import {
  GridTableIcon,
  GridViewIcon,
  Tag01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { createFileRoute } from "@tanstack/react-router"
import type { Service } from "@wappiz/api-client/types/services"
import type React from "react"
import { useCallback, useState } from "react"

import { CreateServiceDialog } from "@/components/services/create-service-dialog"
import { ServiceCard } from "@/components/services/service-card"
import { UpdateServiceDialog } from "@/components/services/update-service-dialog"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/client-api"
import { priceFormatter } from "@/lib/intl"

export const Route = createFileRoute("/_authed/dashboard/services")({
  component: RouteComponent,
  loader: async () => {
    const services = await api.services.list()
    return {
      services,
    }
  },
  pendingComponent: PendingComponent,
})

type ViewMode = "cards" | "table"

const STORAGE_KEY = "services-view"

function getInitialView(): ViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "cards" || stored === "table") {
      return stored
    }
  } catch {
    // localStorage may be unavailable
  }
  return "cards"
}

function ServicesTableView({ services }: { services: Service[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Precio</TableHead>
          <TableHead>Duración</TableHead>
          <TableHead>Buffer</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.map((service) => (
          <TableRow key={service.id}>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium">{service.name}</span>
                {service.description && (
                  <span className="max-w-xs truncate text-xs text-muted-foreground">
                    {service.description}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">
                {priceFormatter.format(service.price)}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground tabular-nums">
              {service.durationMinutes} min
            </TableCell>
            <TableCell className="text-muted-foreground tabular-nums">
              {service.bufferMinutes > 0 ? `${service.bufferMinutes} min` : "—"}
            </TableCell>
            <TableCell>
              <UpdateServiceDialog service={service} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function RouteComponent() {
  const { services } = Route.useLoaderData()
  const [view, setView] = useState<ViewMode>(getInitialView)
  const serviceCount = services.length

  const handleViewChange = useCallback((value: unknown) => {
    if (value === "cards" || value === "table") {
      setView(value)
      try {
        localStorage.setItem(STORAGE_KEY, value)
      } catch {
        // localStorage may be unavailable
      }
    }
  }, [])

  let content: React.ReactNode

  if (serviceCount === 0) {
    content = (
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
    )
  } else if (view === "table") {
    content = <ServicesTableView services={services} />
  } else {
    content = (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-4 sm:items-center">
        <div className="flex shrink-0 items-center gap-2">
          {serviceCount > 0 && (
            <Tabs value={view} onValueChange={handleViewChange}>
              <TabsList aria-label="Cambiar vista">
                <TabsTrigger value="cards" aria-label="Vista de tarjetas">
                  <HugeiconsIcon
                    icon={GridViewIcon}
                    size={14}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </TabsTrigger>
                <TabsTrigger value="table" aria-label="Vista de tabla">
                  <HugeiconsIcon
                    icon={GridTableIcon}
                    size={14}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <CreateServiceDialog />
        </div>
      </div>

      {content}
    </div>
  )
}

function PendingComponent() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-4 sm:items-center">
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-8 w-17" />
          <Skeleton className="h-8 w-38" />
        </div>
      </div>

      <Skeleton className="h-12 w-full" />
    </div>
  )
}
