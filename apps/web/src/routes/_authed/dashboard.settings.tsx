import { createFileRoute } from "@tanstack/react-router"

import { SettingsForm } from "@/components/dashboard/settings-form"
import { api } from "@/lib/client-api"

export const Route = createFileRoute("/_authed/dashboard/settings")({
  component: RouteComponent,
  loader: async () => {
    const tenant = await api.tenants.byUser()
    return { tenant }
  },
})

function RouteComponent() {
  const { tenant } = Route.useLoaderData()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configura el comportamiento de tu negocio y el chatbot.
        </p>
      </div>

      <SettingsForm defaultValues={tenant.settings} />
    </div>
  )
}
