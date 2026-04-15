import {
  Calendar01Icon,
  Clock01Icon,
  Settings01Icon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Section, SectionContent } from "../layout/section"

const features = [
  {
    description:
      "Agrega personal, salas o equipos y define horarios y disponibilidad individuales.",
    icon: UserMultipleIcon,
    title: "Tu personal y tus espacios",
  },
  {
    description:
      "Define servicios con duración y precio, y asígnalos a tu personal o espacios.",
    icon: Settings01Icon,
    title: "Catálogo de servicios",
  },
  {
    description:
      "Configura horarios de atención, tiempo entre citas y disponibilidad por persona.",
    icon: Calendar01Icon,
    title: "Agenda inteligente",
  },
  {
    description:
      "Agrega festivos, vacaciones o cambios de horario puntuales en segundos.",
    icon: Clock01Icon,
    title: "Festivos y vacaciones",
  },
]

export function FeaturesSection() {
  return (
    <Section>
      <SectionContent>
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-16">
          <div className="shrink-0 space-y-2 lg:w-56">
            <h2 className="text-foreground/90 text-xl font-semibold tracking-tight sm:text-2xl">
              Todo bajo tu control
            </h2>
            <p className="text-foreground/45 text-sm leading-relaxed sm:text-base">
              Servicios, horarios y personal. Todo en un solo lugar.
            </p>
          </div>

          <div className="flex-1 divide-y divide-foreground/6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col gap-1.5 py-5 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={feature.icon}
                    size={14}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="text-foreground/35 shrink-0"
                  />
                  <h3 className="text-foreground/90 text-sm font-semibold">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-foreground/50 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </SectionContent>
    </Section>
  )
}
