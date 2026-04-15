import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { usePostHog } from "@posthog/react"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

import { Section, SectionContent } from "../layout/section"

export function CtaSection() {
  const posthog = usePostHog()

  return (
    <Section>
      <SectionContent>
        <div className="flex flex-col items-center gap-5 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-foreground/90 sm:text-2xl">
            Empieza en 10 minutos.
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            Sin contratos ni tarjeta de crédito. Si no funciona para tu
            negocio, no perdiste nada.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              render={<Link to="/sign-up" />}
              nativeButton={false}
              size="lg"
              className="h-11 px-4"
              variant="default"
              onClick={() =>
                posthog.capture("cta_button_clicked", {
                  button: "cta_sign_up",
                })
              }
            >
              Empezar gratis
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                aria-hidden="true"
                data-icon="inline-end"
              />
            </Button>
          </div>
        </div>
      </SectionContent>
    </Section>
  )
}
