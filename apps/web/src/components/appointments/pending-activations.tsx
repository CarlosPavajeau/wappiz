import { CalendarOffIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery } from "@tanstack/react-query"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/client-api"

import { PendingActivationCard } from "./pending-activation"

export function PendingActivations() {
  const { data: requests, isLoading } = useQuery({
    queryFn: api.admin.pendingActivations,
    queryKey: ["pending-activations"],
  })

  if (isLoading) {
    return <Spinner />
  }

  if (!requests || requests.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={CalendarOffIcon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>No hay activaciones pendientes</EmptyTitle>
          <EmptyDescription>
            No hay activaciones pendientes para mostrar.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

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
