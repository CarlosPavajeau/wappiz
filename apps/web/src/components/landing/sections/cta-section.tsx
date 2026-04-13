import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

import { Section, SectionContent } from "../layout/section"

export function CtaSection() {
  return (
    <Section>
      <SectionContent>
        <div className="flex flex-col items-center gap-5 text-center">
          <h2 className="text-foreground/90 text-xl font-semibold tracking-tight sm:text-2xl">
            ¿Listo para simplificar tu agenda?
          </h2>
          <p className="text-foreground/45 max-w-md text-sm leading-relaxed sm:text-base">
            Súmate a los negocios que ya usan wappiz para gestionar citas sin
            esfuerzo por WhatsApp.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
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
