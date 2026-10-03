import { queryOptions } from "@tanstack/react-query"
import type { AvailabilityParams } from "@wappiz/api-client/types/public-booking"

import { api } from "@/lib/client-api"

export const publicTenantQuery = (slug: string) =>
  queryOptions({
    queryFn: () => api.publicBooking.getTenant(slug),
    queryKey: ["public-booking", slug],
    staleTime: 5 * 60 * 1000,
  })

export const publicAvailabilityQuery = (params: AvailabilityParams) =>
  queryOptions({
    queryFn: () => api.publicBooking.availability(params),
    queryKey: [
      "public-booking",
      params.slug,
      "availability",
      params.serviceId,
      params.resourceId ?? "any",
      params.date,
    ],
    // Slots are taken by other customers in real time; keep them fresh.
    staleTime: 30 * 1000,
  })
