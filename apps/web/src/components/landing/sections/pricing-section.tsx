import {
  ArrowRight01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { usePostHog } from "@posthog/react"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

import { Section, SectionContent } from "../layout/section"

const plans = [
  {
    id: "free",
    badge: null,
    cta: "Comenzar gratis",
    description: "Para dar tus primeros pasos",
    features: [
      { included: true, text: "Hasta 50 citas/mes" },
      { included: true, text: "1 recurso" },
      { included: true, text: "Recordatorios básicos (24h)" },
      { included: false, text: "Sin métricas" },
    ],
    highlighted: false,
    href: "/sign-up",
    search: {},
    name: "Gratis",
    period: null,
    price: null,
  },
  {
    id: "pro",
    badge: "Recomendado",
    cta: "Empezar con Pro",
    description: "Para negocios que quieren crecer",
    features: [
      { included: true, text: "Citas ilimitadas" },
      { included: true, text: "Hasta 5 recursos" },
      { included: true, text: "Recordatorios configurables" },
      { included: true, text: "Métricas del negocio" },
      { included: true, text: "Lista de espera" },
      { included: true, text: "Citas recurrentes" },
    ],
    highlighted: true,
    href: "/sign-up",
    search: {
      plan: "pro",
    },
    name: "Pro",
    period: "COP/mes",
    price: "$49.900",
  },
  {
    id: "business",
    badge: null,
    cta: "Empezar con Negocio",
    description: "Para cadenas y múltiples sucursales",
    features: [
      { included: true, text: "Todo lo del Plan Pro" },
      { included: true, text: "Recursos ilimitados" },
      { included: true, text: "Página de reservas pública" },
      { included: true, text: "Soporte prioritario" },
      { included: true, text: "Multi-sucursal (próximamente)" },
    ],
    highlighted: false,
    href: "/sign-up",
    search: {
      plan: "business",
    },
    name: "Negocio",
    period: "COP/mes",
    price: "$99.900",
  },
] as const

export function PricingSection() {
  const posthog = usePostHog()

  return (
    <Section>
      <SectionContent>
        <div className="mb-6 max-w-lg space-y-2 lg:mb-10">
          <h2 className="text-foreground/90 text-xl font-semibold tracking-tight sm:text-2xl">
            Elige el plan que mejor se adapta
          </h2>
          <p className="text-foreground/45 text-sm leading-relaxed sm:text-base">
            Empieza gratis y escala cuando tu negocio lo necesite. Sin
            contratos, cancela cuando quieras.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-xl border p-6 transition-colors ${
                plan.highlighted
                  ? "border-primary/60 bg-primary/5"
                  : "border-border/60 hover:border-primary/40"
              }`}
            >
              {plan.badge ? (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold">
                    {plan.badge}
                  </span>
                </div>
              ) : null}

              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <div className="mt-4 mb-6">
                {plan.price ? (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>
                ) : (
                  <span className="text-3xl font-bold">Gratis</span>
                )}
              </div>

              <ul className="mb-6 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li
                    key={feature.text}
                    className="flex items-start gap-2 text-sm"
                  >
                    <HugeiconsIcon
                      icon={
                        feature.included ? CheckmarkCircle01Icon : Cancel01Icon
                      }
                      size={16}
                      strokeWidth={1.5}
                      className={`mt-0.5 shrink-0 ${
                        feature.included
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                      aria-hidden="true"
                    />
                    <span
                      className={
                        feature.included ? "" : "text-muted-foreground"
                      }
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                render={<Link to={plan.href} search={plan.search} />}
                nativeButton={false}
                size="lg"
                className="px-4 h-9.5"
                variant={plan.highlighted ? "default" : "outline"}
                data-icon="inline-end"
                onClick={() =>
                  posthog.capture("cta_button_clicked", {
                    button: `pricing_${plan.id}_sign_up`,
                    plan: plan.id,
                  })
                }
              >
                {plan.cta}
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </Button>
            </div>
          ))}
        </div>
      </SectionContent>
    </Section>
  )
}
