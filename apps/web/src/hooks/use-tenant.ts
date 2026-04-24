import { useQuery } from "@tanstack/react-query"

import { authClient } from "@/lib/auth-client"
import { api } from "@/lib/client-api"

export function useTenant() {
  const { data, isPending } = authClient.useSession()
  const shouldFetch = !isPending && data?.user.role !== "admin"

  return useQuery({
    enabled: shouldFetch,
    queryFn: () => api.tenants.byUser(),
    queryKey: ["tenant"],
    staleTime: 5 * 60 * 1000,
  })
}
