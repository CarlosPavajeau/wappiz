import {
  ArrowRight02Icon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  CreditCardIcon,
  InformationCircleIcon,
  Invoice01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import type { CustomerState, Order } from "@wappiz/polar"
import { use } from "react"

import { tenantContext, TenantProvider } from "@/components/tenant-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_authed/dashboard/billing")({
  component: RouteComponent,
})

const INTERVAL_LABELS: Record<string, string> = {
  month: "mes",
  year: "año",
  week: "semana",
  day: "día",
}

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  trialing: "Periodo de prueba",
  canceled: "Cancelado",
  pending: "Pendiente",
  revoked: "Revocado",
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date))
}

function formatCurrency(amount: number, currency = "COP"): string {
  return new Intl.NumberFormat("es-CO", {
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(amount / 100)
}

type PlanStatus =
  | "active"
  | "trialing"
  | "canceled"
  | "pending"
  | "revoked"
  | "free"

function StatusDot({ status }: { status: PlanStatus }) {
  const isActive = status === "active" || status === "trialing"
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full",
        isActive
          ? "bg-primary shadow-[0_0_6px_var(--color-primary)]"
          : status === "free"
            ? "bg-muted-foreground"
            : "bg-muted-foreground/50"
      )}
    />
  )
}

function PlanSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  )
}

function FreePlanCard() {
  const { tenant } = use(tenantContext)
  const { mutate: checkout } = useMutation({
    mutationFn: () =>
      authClient.checkout({
        products: ["eebb93c1-4ee7-4311-8f32-b44922346880"],
        metadata: { tenant_id: tenant?.id },
      }),
  })

  const handleCheckout = () => {
    checkout()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <StatusDot status="free" />
          <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Plan actual
          </span>
        </div>

        <div className="flex items-baseline gap-3 pt-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            Plan Gratuito
          </h2>
          <Badge variant="outline" className="text-xs">
            Gratis
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          Ideal para empezar. Sin tarjeta de crédito requerida.
        </p>
      </div>

      <Separator />

      <div className="grid gap-2 sm:grid-cols-2">
        {[
          "Hasta 30 citas al mes",
          "1 recurso",
          "Chatbot de WhatsApp",
          "Soporte por email",
        ].map((feature) => (
          <div key={feature} className="flex items-center gap-2">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={14}
              strokeWidth={1.5}
              className="shrink-0 text-primary"
              aria-hidden="true"
            />
            <span className="text-sm text-muted-foreground">{feature}</span>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2.5 rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        <HugeiconsIcon
          icon={InformationCircleIcon}
          size={15}
          strokeWidth={1.5}
          className="mt-px shrink-0"
          aria-hidden="true"
        />
        <p>
          Actualiza tu plan para acceder a más citas, múltiples recursos y
          funciones avanzadas.
        </p>
      </div>

      <Button onClick={handleCheckout}>Actualizar plan</Button>
    </div>
  )
}

function ActivePlanCard({ customerState }: { customerState: CustomerState }) {
  const subscription = customerState.activeSubscriptions[0]

  if (!subscription) {
    return <FreePlanCard />
  }

  const status = subscription.status as PlanStatus
  const isActive = status === "active" || status === "trialing"
  const renewalDate = subscription.cancelAtPeriodEnd
    ? null
    : subscription.currentPeriodEnd

  async function handleManageSubscription() {
    const result = await authClient.customer.portal()

    if (result.data?.url) {
      window.open(result.data.url, "_blank", "noopener")
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Plan actual
          </span>
        </div>

        <div className="flex flex-wrap items-baseline gap-3 pt-1">
          {/* TODO: resolve product name from productId via Polar subscriptions list or DB query */}
          <h2 className="text-2xl font-semibold tracking-tight">Pro</h2>

          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold tabular-nums">
              {formatCurrency(subscription.amount, subscription.currency)}
            </span>
            <span className="text-sm text-muted-foreground">
              /
              {INTERVAL_LABELS[subscription.recurringInterval] ??
                subscription.recurringInterval}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          <Badge
            variant={isActive ? "default" : "outline"}
            className={cn(!isActive && "text-muted-foreground")}
          >
            {STATUS_LABELS[status] ?? status}
          </Badge>

          {subscription.cancelAtPeriodEnd && (
            <span className="text-xs text-destructive">
              Cancela al final del periodo
            </span>
          )}
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <HugeiconsIcon
              icon={Calendar03Icon}
              size={13}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            Periodo actual
          </div>
          <p className="text-sm tabular-nums">
            {formatDate(subscription.currentPeriodStart)} —{" "}
            {formatDate(subscription.currentPeriodEnd)}
          </p>
        </div>

        {renewalDate && (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <HugeiconsIcon
                icon={CreditCardIcon}
                size={13}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              Próximo cobro
            </div>
            <p className="text-sm tabular-nums">{formatDate(renewalDate)}</p>
          </div>
        )}

        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Miembro desde</p>
          <p className="text-sm tabular-nums">
            {formatDate(subscription.startedAt ?? subscription.createdAt)}
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={handleManageSubscription}
        aria-label="Administrar suscripción en el portal de Polar"
      >
        Administrar suscripción
        <HugeiconsIcon
          icon={ArrowRight02Icon}
          strokeWidth={2}
          aria-hidden="true"
          data-icon="inline-end"
        />
      </Button>
    </div>
  )
}

function OrdersTable() {
  const { data: orders, isPending } = useQuery({
    queryFn: async () => {
      // TODO: if authClient.polar.orders is not accessible, fetch from our DB instead via a server function
      const result = await authClient.customer.orders.list({
        query: {
          limit: 10,
        },
      })

      if (result.error) throw result.error
      return result.data
    },
    queryKey: ["polar", "orders"],
    retry: false,
  })

  if (isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    )
  }

  const items = orders?.result?.items ?? []

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-1 py-8 text-sm text-muted-foreground">
        <HugeiconsIcon
          icon={Invoice01Icon}
          size={20}
          strokeWidth={1.5}
          className="mb-1 text-muted-foreground/50"
          aria-hidden="true"
        />
        No hay pagos registrados todavía.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Producto</TableHead>
          <TableHead className="text-right">Monto</TableHead>
          <TableHead className="text-right">Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((order: Order) => (
          <TableRow key={order.id}>
            <TableCell className="text-muted-foreground tabular-nums">
              {formatDate(order.createdAt)}
            </TableCell>
            <TableCell className="font-medium">
              {/* TODO: order.product?.name when available from API response */}
              {order.product?.name ?? "Suscripción"}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(order.totalAmount, order.currency)}
            </TableCell>
            <TableCell className="text-right">
              <Badge
                variant={order.status === "paid" ? "default" : "outline"}
                className="ml-auto text-xs"
              >
                {order.status === "paid" ? "Pagado" : "Reembolsado"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function RouteComponent() {
  const { data: customerState, isPending } = useQuery({
    queryFn: async () => {
      // authClient.polar.state() calls GET /api/auth/customer/state via the polar better-auth plugin
      const result = await authClient.customer.state()

      if (result.error) return null
      return result.data
    },
    queryKey: ["polar", "state"],
    retry: false,
  })

  const hasActivePlan =
    !isPending &&
    customerState != null &&
    customerState.activeSubscriptions.length > 0

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
          ) : hasActivePlan ? (
            <ActivePlanCard customerState={customerState} />
          ) : (
            <FreePlanCard />
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
