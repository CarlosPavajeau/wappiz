import { useQueryClient } from "@tanstack/react-query"
import type { Service } from "@wappiz/api-client/types/services"

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { api } from "@/lib/client-api"
import { listServicesQuery } from "@/queries/services"

export function DeleteServiceDialog({ service }: { service: Service }) {
  const queryClient = useQueryClient()

  return (
    <ConfirmDeleteDialog
      entity="servicio"
      name={service.name}
      onDelete={() => api.services.delete(service.id)}
      onDeleted={() => queryClient.invalidateQueries(listServicesQuery)}
    />
  )
}
