import {
  createFileRoute,
  Link,
  Outlet,
  useMatches,
} from "@tanstack/react-router"
import { Fragment } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { TenantProvider } from "@/components/tenant-provider"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export const Route = createFileRoute("/_authed/dashboard")({
  component: RouteComponent,
})

const EXCLUDED_ROUTE_IDS = new Set([
  "__root__",
  "/_authed",
  "/_authed/dashboard",
])

function getRouteLabel(routeId: string, loaderData: unknown): string {
  switch (routeId) {
    case "/_authed/dashboard/": {
      return "Inicio"
    }
    case "/_authed/dashboard/resources/": {
      return "Recursos"
    }
    case "/_authed/dashboard/resources/$id": {
      const data = loaderData as { resource?: { name?: string } } | undefined
      return data?.resource?.name ?? "Recurso"
    }
    case "/_authed/dashboard/services": {
      return "Servicios"
    }
    case "/_authed/dashboard/customers": {
      return "Clientes"
    }
    case "/_authed/dashboard/users": {
      return "Usuarios"
    }
    case "/_authed/dashboard/settings": {
      return "Configuración"
    }
    default: {
      return ""
    }
  }
}

function DashboardBreadcrumb() {
  const matches = useMatches()

  const crumbs = matches
    .filter((m) => !EXCLUDED_ROUTE_IDS.has(m.routeId))
    .map((m) => ({
      id: m.id,
      label: getRouteLabel(m.routeId, m.loaderData),
      pathname: m.pathname,
    }))
    .filter((c) => c.label !== "")

  if (crumbs.length === 0) {
    return null
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <Fragment key={crumb.id}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link to={crumb.pathname} />}>
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function RouteComponent() {
  return (
    <TenantProvider>
      <SidebarProvider>
        <AppSidebar />

        <SidebarInset>
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center border-b border-border bg-background/75 backdrop-blur-xl">
            <nav
              aria-label="Navegacion principal"
              className="flex w-full items-center justify-between px-4 sm:px-6"
            >
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <DashboardBreadcrumb />
              </div>

              <ModeToggle />
            </nav>
          </header>

          <div className="px-4 pt-8 pb-16 sm:px-6">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TenantProvider>
  )
}
