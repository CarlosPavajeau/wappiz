import { createFileRoute, Link, Outlet } from "@tanstack/react-router"

import { AppSidebar } from "@/components/app-sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { TenantProvider } from "@/components/tenant-provider"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export const Route = createFileRoute("/_authed/dashboard")({
  component: RouteComponent,
})

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
                <Link
                  className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
                  to="/dashboard"
                >
                  wappiz
                </Link>
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
