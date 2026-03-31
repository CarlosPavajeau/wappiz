import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_authed/onboarding")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="flex min-h-full flex-col items-center gap-8 px-4 py-10">
        <span className="text-lg font-semibold tracking-tight">wappiz</span>
        <div className="w-full max-w-lg">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
