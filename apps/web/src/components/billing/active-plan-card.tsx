import { LinkSquare02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { CustomerState } from "@wappiz/polar"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { authClient } from "@/lib/auth-client"
import { formatCurrency } from "@/lib/intl"
import { cn } from "@/lib/utils"

import { FreePlanCard } from "./free-plan-card"

type PlanStatus =
  | "active"
  | "trialing"
  | "canceled"
  | "pending"
  | "revoked"
  | "free"

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

type Props = {
  customerState?: CustomerState | null
}

export function ActivePlanCard({ customerState }: Props) {
  const subscription = customerState?.activeSubscriptions[0]

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
      window.open(result.data.url, "_self", "noopener")
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex flex-wrap items-baseline gap-3 pt-1">
          <h2 className="text-2xl font-semibold tracking-tight">Pro</h2>

          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold tabular-nums">
              {formatCurrency(subscription.amount / 100, subscription.currency)}
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
            Periodo actual
          </div>
          <p className="text-sm tabular-nums">
            {format(subscription.currentPeriodStart, "d 'de' MMMM 'de' yyyy", {
              locale: es,
            })}{" "}
            —{" "}
            {format(subscription.currentPeriodEnd, "d 'de' MMMM 'de' yyyy", {
              locale: es,
            })}
          </p>
        </div>

        {renewalDate && (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Próximo cobro
            </div>
            <p className="text-sm tabular-nums">
              {format(renewalDate, "d 'de' MMMM 'de' yyyy", {
                locale: es,
              })}
            </p>
          </div>
        )}

        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Miembro desde</p>
          <p className="text-sm tabular-nums">
            {format(
              subscription.startedAt ?? subscription.createdAt,
              "d 'de' MMMM 'de' yyyy",
              {
                locale: es,
              }
            )}
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
          icon={LinkSquare02Icon}
          strokeWidth={2}
          aria-hidden="true"
          data-icon="inline-end"
        />
      </Button>
    </div>
  )
}
