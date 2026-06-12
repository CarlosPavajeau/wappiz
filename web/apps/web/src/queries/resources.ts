import { queryOptions } from "@tanstack/react-query"
import { addYears, format } from "date-fns"

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

export const listResourceOverridesQuery = (id: string) =>
  queryOptions({
    queryKey: ["resources", id, "overrides"],
    queryFn: () => {
      // Overrides can span long periods (e.g. vacations months away), so ask
      // for a year ahead instead of the API's 30-day default window.
      const today = new Date()
      return api.resources.listOverrides(id, {
        params: {
          from: format(today, "yyyy-MM-dd"),
          to: format(addYears(today, 1), "yyyy-MM-dd"),
        },
      })
    },
  })
