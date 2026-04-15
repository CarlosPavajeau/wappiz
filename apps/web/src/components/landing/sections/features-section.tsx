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
    title: "Horarios y disponibilidad",
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
            <h2 className="text-xl font-semibold tracking-tight text-foreground/90 sm:text-2xl">
              Todo bajo tu control
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Define qué ofreces, cuándo atiendes y quién lo hace.
            </p>
          </div>

          <ul className="flex-1 divide-y divide-foreground/6">
            {features.map((feature) => (
              <li
                key={feature.title}
                className="flex flex-col gap-1.5 py-5 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={feature.icon}
                    size={14}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="shrink-0 text-foreground/35"
                  />
                  <h3 className="text-sm font-semibold text-foreground/90">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </SectionContent>
    </Section>
  )
}
