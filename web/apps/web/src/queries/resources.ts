import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/client-api"

export const listResourcesQuery = queryOptions({
  queryKey: ["resources"],
  queryFn: () => api.resources.list(),
})

export const getResourceQuery = (id: string) =>
  queryOptions({
    queryKey: ["resources", id],
    queryFn: () => api.resources.get(id),
  })

export const listResourceServicesQuery = (id: string) =>
  queryOptions({
    queryKey: ["resources", id, "services"],
    queryFn: () => api.resources.services(id),
  })

export const listResourceOverviewsQuery = (id: string) =>
  queryOptions({
    queryKey: ["resources", id, "overviews"],
    queryFn: () => api.resources.listOverrides(id),
  })
