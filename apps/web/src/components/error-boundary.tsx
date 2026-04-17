import { withErrorBoundary } from "@sentry/tanstackstart-react"
import { Link, type ErrorComponentProps } from "@tanstack/react-router"

import { Section, SectionContent } from "./landing/layout/section"
import { Button } from "./ui/button"

function ErrorBoundary({ error }: ErrorComponentProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Section last className="flex-1">
        <SectionContent className="relative flex min-h-dvh flex-col items-center justify-center">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute font-sans text-[clamp(10rem,30vw,22rem)] leading-none font-bold tracking-tighter text-foreground opacity-[0.015] select-none"
          >
            ERROR
          </span>

          <div className="relative flex flex-col items-center gap-4 text-center">
            <p className="font-mono text-xs tracking-widest text-foreground/30 uppercase">
              Ha ocurrido un error
            </p>

            <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
              {error.message}
            </h1>

            <p className="max-w-xs text-sm text-foreground/50">{error.stack}</p>

            <div className="pt-2">
              <Button size="lg" render={<Link to="/" />} nativeButton={false}>
                Volver al inicio
              </Button>
            </div>
          </div>
        </SectionContent>
      </Section>
    </div>
  )
}

export const SentryErrorBoundary = withErrorBoundary(ErrorBoundary, {})
