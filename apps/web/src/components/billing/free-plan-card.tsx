import {
  ArrowRightIcon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { use } from "react"

import { tenantContext } from "@/components/tenant-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth-client"
import { api } from "@/lib/client-api"

export function FreePlanCard() {
  const { data: plans, isLoading } = useQuery({
    queryFn: () => api.billing.listPlans(),
    queryKey: ["billing", "plans"],
  })

  const { tenant } = use(tenantContext)
  const { mutate: checkout } = useMutation({
    mutationFn: (productId: string) =>
      authClient.checkout({
        metadata: { tenant_id: tenant?.id },
        products: [productId],
      }),
  })

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
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
              strokeWidth={2}
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
          strokeWidth={2}
          className="mt-px shrink-0"
          aria-hidden="true"
        />
        <p>
          Actualiza tu plan para acceder a más citas, múltiples recursos y
          funciones avanzadas.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2">
          <Spinner />
        </div>
      )}

      {plans && (
        <div className="flex items-center gap-2">
          {plans.map((plan) => (
            <Button
              key={plan.id}
              onClick={() => checkout(plan.externalId)}
              size="lg"
            >
              Subscribirse a {plan.name}
              <HugeiconsIcon
                icon={ArrowRightIcon}
                strokeWidth={2}
                className="shrink-0"
                aria-hidden="true"
              />
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
