import { keepPreviousData, queryOptions } from "@tanstack/react-query"
import type { ListCustomersParams } from "@wappiz/api-client/types/customers"

import { api } from "@/lib/client-api"

/** Root key: invalidate it after any change to a customer. */
export const customersQueryKey = ["customers"] as const

/** Request params cannot hold `undefined`, so absent filters are dropped. */
function toRequestParams(params: ListCustomersParams) {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string | number] => entry[1] !== undefined
  )
  return Object.fromEntries(entries)
}

export const listCustomersQuery = (params: ListCustomersParams) =>
  queryOptions({
    // Keeps the current page on screen while the next one loads, so typing a
    // filter never flashes an empty table.
    placeholderData: keepPreviousData,
    queryFn: () => api.customers.list({ params: toRequestParams(params) }),
    queryKey: [...customersQueryKey, "list", params],
  })
