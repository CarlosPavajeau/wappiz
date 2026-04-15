import { ArrowRight01Icon, Calendar01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { usePostHog } from "@posthog/react"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

import { Section, SectionContent } from "../layout/section"
import { ChatMockup } from "./chat-mockup"

export function HeroSection() {
  const posthog = usePostHog()

  return (
    <Section>
      <SectionContent>
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col items-center text-center lg:max-w-lg lg:items-start lg:text-left">
            <div className="space-y-2.5 sm:space-y-4">
              <div className="flex items-center justify-center gap-1.5 lg:justify-start">
                <HugeiconsIcon
                  icon={Calendar01Icon}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="size-[0.9em] text-foreground"
                />
                <span className="text-sm text-muted-foreground sm:text-base">
                  Sin mensajes de ida y vuelta. Solo citas confirmadas.
                </span>
              </div>

              <h1 className="text-3xl leading-tight tracking-tight text-foreground lg:text-[2.5rem]">
                Agendamiento automático
                <br />
                por{" "}
                <span className="border-b border-dashed border-foreground/20">
                  WhatsApp
                </span>
              </h1>

              <p className="max-w-md text-sm leading-relaxed text-foreground/50 sm:text-base">
                Tus clientes reservan por el WhatsApp que ya usan. Tú controlas
                servicios, horarios y disponibilidad desde un panel y nunca más
                pierdes una cita.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:mt-8 sm:gap-4 lg:mt-12 lg:justify-start">
                <Button
                  render={<Link to="/sign-up" />}
                  nativeButton={false}
                  size="lg"
                  className="h-9.5 px-4"
                  variant="default"
                  onClick={() =>
                    posthog.capture("cta_button_clicked", {
                      button: "hero_sign_up",
                    })
                  }
                >
                  Empezar gratis
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    aria-hidden="true"
                    data-icon="inline-end"
                  />
                </Button>
              </div>
            </div>
          </div>

          <ChatMockup />
        </div>
      </SectionContent>
    </Section>
  )
}
