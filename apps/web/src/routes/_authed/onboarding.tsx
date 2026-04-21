import { BubbleChatIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { createFileRoute, Link, Outlet } from "@tanstack/react-router"

import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/_authed/onboarding")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
})

function OnboardingNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          aria-label="wappiz — ir al inicio"
          className="flex items-center gap-2 transition-opacity hover:opacity-70"
        >
          <HugeiconsIcon
            icon={BubbleChatIcon}
            strokeWidth={1.5}
            className="h-5 w-5 text-primary"
            aria-hidden="true"
          />
          <span className="text-lg font-semibold tracking-tight">wappiz</span>
        </Link>
      </div>
    </nav>
  )
}

function RouteComponent() {
  return (
    <main className="row-span-2 overflow-y-auto">
      <OnboardingNav />
      <section className="flex flex-col items-center px-4 py-16">
        <Outlet />
      </section>
    </main>
  )
}

export function PendingComponent() {
  return (
    <main className="row-span-2 overflow-y-auto">
      <OnboardingNav />
      <section className="flex flex-col items-center px-4 py-16">
        <div className="flex w-full max-w-lg flex-col gap-8">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>

            <div className="flex justify-end">
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
