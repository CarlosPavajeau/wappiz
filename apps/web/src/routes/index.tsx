import {
  ArrowRight01Icon,
  BubbleChatIcon,
  Calendar01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  Settings01Icon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: HomeComponent,
  head: () => ({
    meta: [
      {
        description:
          "Permite que tus clientes agenden citas directamente desde WhatsApp. Gestiona recursos, servicios y disponibilidad en un solo lugar.",
        title: "wappiz — Citas por WhatsApp",
      },
    ],
  }),
})

const FEATURES = [
  {
    description:
      "Agrega personal, salas o equipos y define horarios y disponibilidad individuales.",
    icon: UserMultipleIcon,
    title: "Gestión de recursos",
  },
  {
    description:
      "Define servicios con duración y precio, y asignalos a recursos específicos.",
    icon: Settings01Icon,
    title: "Catálogo de servicios",
  },
  {
    description:
      "Configura horarios de atención, tiempos de buffer y ventanas de disponibilidad por recurso.",
    icon: Calendar01Icon,
    title: "Agenda inteligente",
  },
  {
    description:
      "Agrega excepciones por feriados, vacaciones o cambios puntuales de disponibilidad en segundos.",
    icon: Clock01Icon,
    title: "Excepciones de horario",
  },
]

const PLANS = [
  {
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
    name: "Gratis",
    period: null,
    price: null,
  },
  {
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
    href: "/sign-up?plan=pro",
    name: "Pro",
    period: "COP/mes",
    price: "$49.900",
  },
  {
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
    href: "/sign-up?plan=business",
    name: "Negocio",
    period: "COP/mes",
    price: "$99.900",
  },
] as const

const ChatBubble = ({
  side,
  text,
  time,
}: {
  side: "left" | "right"
  text: string
  time: string
}) => {
  const isRight = side === "right"
  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-xl px-3 py-1.5 shadow-sm ${
          isRight
            ? "rounded-tr-sm bg-[#DCF8C6] dark:bg-[#025C4C]"
            : "rounded-tl-sm bg-white dark:bg-[#1F2C34]"
        } text-xs text-foreground`}
      >
        <p>{text}</p>
        <p
          className={`mt-0.5 text-[10px] text-[#667781] dark:text-[#8696A0] ${isRight ? "text-right" : ""}`}
        >
          {time}
        </p>
      </div>
    </div>
  )
}

function HomeComponent() {
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
          <div className="flex items-center gap-3">
            <Link
              to="/sign-in"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/sign-up"
              className="rounded-lg bg-[#25D366] px-4 py-2 text-sm font-medium text-[#052e16] transition-colors hover:bg-[#1db356]"
            >
              Comenzar
            </Link>
          </div>
        </div>
      </nav>

      <section className="flex min-h-[calc(100svh-4rem)] items-center">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          {/* Copy */}
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#25D366]/25 bg-[#25D366]/10 px-3 py-1.5 text-sm font-medium text-[#128C7E]">
              <HugeiconsIcon
                icon={BubbleChatIcon}
                size={14}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              Agenda de citas por WhatsApp
            </div>

            <h1 className="text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Citas,
              <br />
              agendadas por
              <br />
              <span className="text-[#25D366]">WhatsApp.</span>
            </h1>

            <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
              Permite que tus clientes agenden desde el chat que ya usan.
              Gestiona recursos, servicios y disponibilidad — todo en un solo
              lugar.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/sign-up"
                className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-6 py-3 text-sm font-semibold text-[#052e16] transition-colors hover:bg-[#1db356]"
              >
                Empezar gratis
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={16}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </Link>
              <Link
                to="/sign-in"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Iniciar sesión
              </Link>
            </div>

            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {[
                "Sin tarjeta de crédito",
                "Plan gratuito disponible",
                "Configuración en minutos",
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <HugeiconsIcon
                    icon={CheckmarkCircle01Icon}
                    size={16}
                    strokeWidth={1.5}
                    className="shrink-0 text-[#25D366]"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* WhatsApp chat mockup */}
          <div className="relative flex items-center justify-center">
            <div className="relative w-75 overflow-hidden rounded-xl border-4 border-foreground/10 bg-background shadow-2xl">
              {/* Chat header */}
              <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]">
                  <HugeiconsIcon
                    icon={Calendar01Icon}
                    size={16}
                    strokeWidth={1.5}
                    className="text-white"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">wappiz</p>
                  <p className="text-xs text-[#25D366]">online</p>
                </div>
              </div>

              {/* Messages */}
              <section
                aria-label="Ejemplo de conversación de WhatsApp para agendar una cita"
                className="min-h-80 space-y-2 bg-[#ECE5DD] p-3 dark:bg-[#0D1418]"
              >
                <ChatBubble
                  side="left"
                  text="¡Hola! Quiero sacar cita para un corte 💇"
                  time="10:24"
                />
                <ChatBubble
                  side="right"
                  text="¡Hola! Elegí un horario disponible:"
                  time="10:24"
                />
                <div className="flex max-w-[72%] flex-col gap-1.5">
                  {["Hoy, 15:00", "Mañana, 10:00", "Jue, 14:30"].map((slot) => (
                    <div
                      key={slot}
                      className="rounded-full border border-[#25D366]/30 bg-white px-3 py-1.5 text-left text-xs text-[#0B8DDD] shadow-sm dark:bg-[#1F2C34]"
                    >
                      {slot}
                    </div>
                  ))}
                </div>
                <ChatBubble side="left" text="Hoy, 15:00" time="10:25" />
                <ChatBubble
                  side="right"
                  text="✅ ¡Cita confirmada! Te esperamos hoy a las 15:00."
                  time="10:25"
                />
              </section>
            </div>

            {/* Ambient glow */}
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 rounded-full bg-[#25D366]/10 blur-3xl"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-border/40 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 space-y-3 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Todo lo que necesitas para gestionar citas
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Una sola plataforma para manejar recursos, servicios y horarios —
              entregada por WhatsApp.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group space-y-3 rounded-xl border border-border/60 p-5 transition-colors hover:border-[#25D366]/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#25D366]/10 transition-colors group-hover:bg-[#25D366]/20">
                  <HugeiconsIcon
                    icon={f.icon}
                    size={20}
                    strokeWidth={1.5}
                    className="text-[#25D366]"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/40 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 space-y-3 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Elige el plan que mejor se adapta
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Empieza gratis y escala cuando tu negocio lo necesite. Sin
              contratos, cancela cuando quieras.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-xl border p-6 transition-colors ${
                  plan.highlighted
                    ? "border-[#25D366]/60 bg-[#25D366]/5"
                    : "border-border/60 hover:border-[#25D366]/40"
                }`}
              >
                {plan.badge ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-[#25D366] px-3 py-1 text-xs font-semibold text-[#052e16]">
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
                          feature.included
                            ? CheckmarkCircle01Icon
                            : Cancel01Icon
                        }
                        size={16}
                        strokeWidth={1.5}
                        className={`mt-0.5 shrink-0 ${
                          feature.included
                            ? "text-[#25D366]"
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

                <Link
                  to={plan.href}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-[#25D366] text-[#052e16] hover:bg-[#1db356]"
                      : "border border-border hover:bg-muted"
                  }`}
                >
                  {plan.cta}
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={16}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/40 py-20">
        <div className="mx-auto max-w-2xl space-y-6 px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">
            ¿Listo para simplificar tu agenda?
          </h2>
          <p className="text-muted-foreground">
            Súmate a los negocios que ya usan wappiz para gestionar citas sin
            esfuerzo por WhatsApp.
          </p>
          <Link
            to="/sign-up"
            className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-8 py-3.5 font-semibold text-[#052e16] transition-colors hover:bg-[#1db356]"
          >
            Empezar gratis
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/40 py-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Brand */}
            <div className="flex items-center gap-2 text-sm font-medium">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-[#25D366]">
                <HugeiconsIcon
                  icon={BubbleChatIcon}
                  size={12}
                  strokeWidth={1.5}
                  className="text-[#052e16]"
                  aria-hidden="true"
                />
              </div>
              <span>wappiz</span>
            </div>

            {/* Links */}
            <div className="flex flex-col items-start gap-1.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-3">
              <Link
                to="/privacy"
                className="transition-colors hover:text-foreground"
              >
                Política de privacidad
              </Link>
              <span aria-hidden="true" className="hidden sm:inline">
                ·
              </span>
              <p>
                © {new Date().getFullYear()} wappiz. Todos los derechos
                reservados.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
