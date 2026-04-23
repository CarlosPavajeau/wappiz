import { createFileRoute, Link } from "@tanstack/react-router"
import { type } from "arktype"

import { RequestResetPasswordForm } from "@/components/auth/request-reset-password-form"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { Button } from "@/components/ui/button"

const search = type({
  "error?": "string",
  "token?": "string",
})

export const Route = createFileRoute("/_auth/reset-password")({
  component: RouteComponent,
  validateSearch: search,
})

function RouteComponent() {
  const { token, error } = Route.useSearch()

  if (!token && !error) {
    return <RequestResetPasswordForm />
  }

  if (error || !token) {
    const message =
      error === "INVALID_TOKEN"
        ? "El enlace no es válido."
        : (!token
          ? "El enlace ha expirado."
          : error)

    return (
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            No se pudo reestablecer la contraseña
          </h2>
          <p className="mt-2 text-sm text-destructive">{message}</p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            render={<Link to="/reset-password" />}
            nativeButton={false}
            className="w-full"
          >
            Solicitar nuevo enlace
          </Button>
          <Button
            render={<Link to="/sign-in" />}
            nativeButton={false}
            variant="ghost"
            className="w-full"
          >
            Volver al inicio de sesión
          </Button>
        </div>
      </div>
    )
  }

  return <ResetPasswordForm token={token} />
}
