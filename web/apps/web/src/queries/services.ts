import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/client-api"

export const listServicesQuery = queryOptions({
  queryKey: ["services"],
  queryFn: () => api.services.list(),
})
