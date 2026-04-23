import { Loading03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { ActivePlanCard } from "@/components/billing/active-plan-card"
import { OrdersTable } from "@/components/billing/orders-table"
import { PlanSkeleton } from "@/components/billing/plan-skeleton"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/_authed/dashboard/billing/")({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: customerState, isPending } = useQuery({
    queryFn: async () => {
      const result = await authClient.customer.state()

      if (result.error) {
        return null
      }
      return result.data
    },
    queryKey: ["polar", "state"],
    retry: false,
  })

  return (
    <div className="space-y-10 sm:space-y-12">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Facturación
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona tu plan y consulta el historial de pagos.
        </p>
      </div>

      <section aria-labelledby="plan-heading">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="plan-heading" className="text-sm font-medium">
            Tu suscripción
          </h2>

          {isPending && (
            <HugeiconsIcon
              icon={Loading03Icon}
              size={14}
              strokeWidth={2}
              className="animate-spin text-muted-foreground"
              aria-label="Cargando..."
            />
          )}
        </div>

        <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          {isPending ? (
            <PlanSkeleton />
          ) : (
            <ActivePlanCard customerState={customerState} />
          )}
        </div>
      </section>

      <section aria-labelledby="orders-heading">
        <h2 id="orders-heading" className="mb-4 text-sm font-medium">
          Historial de pagos
        </h2>

        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="px-4 py-3 sm:px-6">
            <OrdersTable />
          </div>
        </div>
      </section>
    </div>
  )
}
