import { useMutation } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

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
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <main className="flex flex-1 flex-col items-center justify-center px-8">
        <div className="w-full max-w-xs">
          <p
            aria-hidden="true"
            className="select-none font-mono text-[9rem] font-black leading-none tracking-tighter text-foreground/8"
          >
            403
          </p>

          <div className="mt-8 border-l-2 border-foreground pl-6">
            <h1 className="text-xl font-semibold tracking-tight">
              Cuenta suspendida
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-foreground/50">
              Tu acceso ha sido revocado por el equipo de wappiz. Si crees que
              esto es un error, escríbenos.
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-2.5 pl-6">
            <a
              href="mailto:soporte@wappiz.co"
              className="w-fit text-sm text-foreground/35 underline-offset-4 transition-colors duration-150 hover:text-foreground hover:underline"
            >
              soporte@wappiz.co
            </a>
            <button
              type="button"
              disabled={isPending}
              onClick={() => signOut()}
              className="w-fit text-sm text-foreground/35 underline-offset-4 transition-colors duration-150 hover:text-foreground hover:underline disabled:pointer-events-none"
            >
              {isPending ? "Cerrando sesión…" : "Cerrar sesión"}
            </button>
          </div>
        </div>
      </main>

      <footer className="px-8 py-6">
        <p className="font-mono text-xs text-foreground/20">wappiz</p>
      </footer>
    </div>
  )
}
