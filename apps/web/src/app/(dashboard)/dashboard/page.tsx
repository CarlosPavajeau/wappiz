import { getServerApi } from "@/lib/server-api"

import { AdminDashboard } from "./_components/admin-dashboard"
import { PendingActivations } from "./_components/pending-activations"

export default async function DashboardPage() {
  const api = await getServerApi()
  const me = await api.auth.me()

  const isSuperAdmin = me.role === "superadmin"

  return <div>{isSuperAdmin ? <PendingActivations /> : <AdminDashboard />}</div>
}
