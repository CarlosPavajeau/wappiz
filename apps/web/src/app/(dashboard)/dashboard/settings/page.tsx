import { Separator } from "@/components/ui/separator"
import { getServerApi } from "@/lib/server-api"

import { SettingsForm } from "./_components/settings-form"

export default async function SettingsPage() {
  const api = await getServerApi()
  const tenant = await api.tenants.byUser()

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Ajustes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configura el comportamiento de tu negocio y el chatbot.
        </p>
      </div>

      <Separator />

      <div className="max-w-7xl">
        <SettingsForm defaultValues={tenant.settings} />
      </div>
    </div>
  )
}
