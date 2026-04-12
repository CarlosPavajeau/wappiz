import { BubbleChatIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { createFileRoute, Outlet } from "@tanstack/react-router"

import { DefaultLoader } from "@/components/default-loader"

export const Route = createFileRoute("/_authed/onboarding")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
})

function RouteComponent() {
  return (
    <main className="row-span-2 overflow-y-auto">
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <HugeiconsIcon
                icon={BubbleChatIcon}
                size={16}
                strokeWidth={1.5}
                className="text-primary-foreground"
                aria-hidden="true"
              />
            </div>
            <span className="text-lg font-semibold tracking-tight">wappiz</span>
          </div>
        </div>
      </nav>
      <section className="flex flex-col items-center gap-8 px-4 py-10">
        <Outlet />
      </section>
    </main>
  )
}

function PendingComponent() {
  return (
    <main className="row-span-2 overflow-y-auto">
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <HugeiconsIcon
                icon={BubbleChatIcon}
                size={16}
                strokeWidth={1.5}
                className="text-primary-foreground"
                aria-hidden="true"
              />
            </div>
            <span className="text-lg font-semibold tracking-tight">wappiz</span>
          </div>
        </div>
      </nav>
      <section className="flex flex-col items-center gap-8 px-4 py-10">
        <DefaultLoader />
      </section>
    </main>
  )
}
