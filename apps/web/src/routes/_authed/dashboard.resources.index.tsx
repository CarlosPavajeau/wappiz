import {
  GridTableIcon,
  GridViewIcon,
  User02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link, createFileRoute } from "@tanstack/react-router"
import type { Resource } from "@wappiz/api-client/types/resources"
import type React from "react"
import { useCallback, useState } from "react"

import { CreateResourceDialog } from "@/components/resources/create-resource-dialog"
import { ResourceCard } from "@/components/resources/resource-card"
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

export const Route = createFileRoute("/_authed/dashboard/resources/")({
  component: RouteComponent,
  loader: async () => {
    const resources = await api.resources.list()
    return {
      resources,
    }
  },
  pendingComponent: PendingComponent,
})

type ViewMode = "cards" | "table"

const STORAGE_KEY = "resources-view"

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

function ResourceAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()

  return (
    <div
      role="img"
      aria-label={name}
      className="bg-primary/10 text-primary ring-primary/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ring-1"
    >
      {initials}
    </div>
  )
}

function ResourcesTableView({ resources }: { resources: Resource[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Recurso</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Días activos</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {resources.map((resource) => {
          const activeCount = resource.workingHours.filter(
            (h) => h.isActive
          ).length

          return (
            <TableRow key={resource.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <ResourceAvatar name={resource.name} />
                  <Link
                    to="/dashboard/resources/$id"
                    params={{ id: resource.id }}
                    className="font-medium hover:underline"
                  >
                    {resource.name}
                  </Link>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground capitalize">
                  {resource.type}
                </span>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  aria-label={`${activeCount} días activos`}
                >
                  {activeCount}d
                </Badge>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function RouteComponent() {
  const { resources } = Route.useLoaderData()
  const [view, setView] = useState<ViewMode>(getInitialView)
  const resourceCount = resources.length

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

  if (resourceCount === 0) {
    content = (
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
    )
  } else if (view === "table") {
    content = <ResourcesTableView resources={resources} />
  } else {
    content = (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-4 sm:items-center">
        <div className="flex shrink-0 items-center gap-2">
          {resourceCount > 0 && (
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
          <CreateResourceDialog />
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
