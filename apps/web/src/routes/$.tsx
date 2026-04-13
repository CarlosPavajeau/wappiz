import { createFileRoute, Link } from "@tanstack/react-router"

import { Section, SectionContent } from "@/components/landing/layout/section"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/$")({
  component: NotFoundPage,
})

function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Section last className="flex-1">
        <SectionContent className="relative flex min-h-dvh flex-col items-center justify-center">
          <span
            aria-hidden="true"
            className="text-foreground pointer-events-none absolute font-sans text-[clamp(10rem,30vw,22rem)] leading-none font-bold tracking-tighter opacity-[0.015] select-none"
          >
            404
          </span>

          <div className="relative flex flex-col items-center gap-4 text-center">
            <p className="text-foreground/30 font-mono text-xs tracking-widest uppercase">
              Error 404
            </p>

            <h1 className="text-foreground text-2xl font-medium tracking-tight sm:text-3xl">
              Página no encontrada
            </h1>

            <p className="text-foreground/50 max-w-xs text-sm">
              La dirección que buscas no existe o fue movida. Puede que el
              enlace esté roto o haya expirado.
            </p>

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
