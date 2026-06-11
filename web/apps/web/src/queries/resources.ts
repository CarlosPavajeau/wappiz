import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/client-api"

export const listResourcesQuery = queryOptions({
  queryKey: ["resources"],
  queryFn: () => api.resources.list(),
})
