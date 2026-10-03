import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/client-api"

export const tenantQuery = queryOptions({
  queryFn: () => api.tenants.byUser(),
  queryKey: ["tenant"],
  staleTime: 5 * 60 * 1000,
})
