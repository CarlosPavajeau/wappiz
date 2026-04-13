import { ArrowRight01Icon, Calendar01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

import { Section, SectionContent } from "../layout/section"
import { ChatMockup } from "./chat-mockup"

export function HeroSection() {
  return (
    <Section>
      <SectionContent>
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="lg:max-w-lg">
            <div className="relative flex w-full flex-col items-center text-center lg:items-start lg:text-left">
              <div className="space-y-2.5 sm:space-y-4">
                <div className="flex items-center justify-center gap-1.5 lg:justify-start">
                  <HugeiconsIcon
                    icon={Calendar01Icon}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="size-[0.9em] text-foreground"
                  />
                  <span className="text-sm text-muted-foreground sm:text-base">
                    Deja de agendar. Empieza a trabajar.
                  </span>
                </div>
                <h1 className="max-w-4xl text-3xl leading-tight tracking-tight text-neutral-800 sm:text-3xl md:text-3xl lg:text-[2.5rem] dark:text-neutral-200">
                  Agendamiento automático
                  <br />
                  por{" "}
                  <span className="border-foreground/20 border-b border-dashed">
                    WhatsApp
                  </span>
                </h1>

                <p className="text-foreground/50 max-w-md text-[13px] leading-relaxed sm:text-base">
                  Tus clientes reservan por el WhatsApp que ya usan. Tú
                  controlas servicios, horarios y disponibilidad desde un panel
                  y nunca más pierdes una cita.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:mt-8 sm:gap-4 lg:mt-12 lg:justify-start">
                  <Button
                    render={<Link to="/sign-up" />}
                    nativeButton={false}
                    size="lg"
                    className="px-4 h-9.5"
                    variant="default"
                  >
                    Empezar gratis
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      strokeWidth={2}
                      aria-hidden="true"
                      data-icon="inline-end"
                    />
                  </Button>

                  <Button
                    render={<Link to="/sign-in" />}
                    nativeButton={false}
                    size="lg"
                    className="px-4 h-9.5"
                    variant="outline"
                  >
                    Iniciar sesión
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <ChatMockup />
        </div>
      </SectionContent>
    </Section>
  )
}
