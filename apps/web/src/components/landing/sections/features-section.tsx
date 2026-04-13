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

export function FeaturesSection() {
  return (
    <Section>
      <SectionContent>
        <div className="mb-6 max-w-lg space-y-2 lg:mb-10">
          <h2 className="text-foreground/90 text-xl font-semibold tracking-tight sm:text-2xl">
            Características
          </h2>
          <p className="text-foreground/45 text-sm leading-relaxed sm:text-base">
            Todo lo que necesitas para gestionar citas
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group border-foreground/8 rounded-[10px] border p-1 transition-colors hover:border-foreground/10"
            >
              <div className="flex h-full flex-col gap-3 rounded-md border border-foreground/6 p-5 transition-colors group-hover:border-foreground/8 group-hover:bg-foreground/1">
                <span className="text-foreground/40 transition-colors group-hover:text-foreground/50">
                  <HugeiconsIcon icon={feature.icon} />
                </span>
                <div className="space-y-1">
                  <h3 className="text-foreground/90 text-sm font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-foreground/45 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionContent>
    </Section>
  )
}
