import { useQuery } from "@tanstack/react-query"
import { useServerFn } from "@tanstack/react-start"

import { getUser } from "@/functions/get-user"
import { tenantQuery } from "@/queries/tenants"

export function useTenant() {
  const getAuth = useServerFn(getUser)
  const { data, isPending } = useQuery({
    queryFn: getAuth,
    queryKey: ["user", "session"],
    staleTime: 5 * 60 * 1000,
  })

  const shouldFetch = !isPending && data?.user.role !== "admin"

  return useQuery({
    ...tenantQuery,
    enabled: shouldFetch,
  })
}
