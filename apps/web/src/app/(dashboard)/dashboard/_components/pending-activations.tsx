import { getServerApi } from "@/lib/server-api"

import { PendingActivationCard } from "./pending-activation"

export async function PendingActivations() {
  const api = await getServerApi()
  const requests = await api.admin.pendingActivations()

  return (
    <div>
      <h1 className="text-2xl mb-4">Activaciones pendientes</h1>
      <ul className="space-y-4">
        {requests.map((request) => (
          <li key={request.tenantId}>
            <PendingActivationCard request={request} />
          </li>
        ))}
      </ul>
    </div>
  )
}
