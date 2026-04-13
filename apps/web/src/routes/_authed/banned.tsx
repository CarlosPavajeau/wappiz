import { useMutation } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { Section, SectionContent } from "@/components/landing/layout/section"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/_authed/banned")({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()

  const { mutate: signOut, isPending } = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      navigate({ to: "/sign-in" })
    },
  })

  return (
    <div className="flex min-h-dvh flex-col">
      <Section last className="flex-1">
        <SectionContent className="relative flex min-h-dvh flex-col items-center justify-center">
          <span
            aria-hidden="true"
            className="text-foreground pointer-events-none absolute font-sans text-[clamp(10rem,30vw,22rem)] leading-none font-bold tracking-tighter opacity-[0.015] select-none"
          >
            403
          </span>

          <div className="relative flex flex-col items-center gap-4 text-center">
            <p className="text-foreground/30 font-mono text-xs tracking-widest uppercase">
              Error 403
            </p>

            <h1 className="text-foreground text-2xl font-medium tracking-tight sm:text-3xl">
              Cuenta suspendida
            </h1>

            <p className="text-foreground/50 max-w-xs text-sm">
              Tu acceso ha sido revocado por el equipo de wappiz. Si crees que
              esto es un error, escríbenos al siguiente correo electrónico:
              <br />
              <Button
                render={<a href="mailto:contact@cantte.com" target="_blank" />}
                variant="link"
                nativeButton={false}
                size="lg"
              >
                contact@cantte.com
              </Button>
            </p>

            <div className="pt-2">
              <Button size="lg" disabled={isPending} onClick={() => signOut()}>
                Cerrar sesión
              </Button>
            </div>
          </div>
        </SectionContent>
      </Section>
    </div>
  )
}
