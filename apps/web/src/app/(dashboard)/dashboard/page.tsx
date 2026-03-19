import { auth } from "@wappiz/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { AdminDashboard } from "./_components/admin-dashboard"
import { PendingActivations } from "./_components/pending-activations"

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect("/login")
  }

  const isSuperAdmin = session.user.role === "admin"

  return <div>{isSuperAdmin ? <PendingActivations /> : <AdminDashboard />}</div>
}
