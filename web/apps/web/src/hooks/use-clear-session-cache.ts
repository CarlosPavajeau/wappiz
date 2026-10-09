import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { useCallback } from "react"

import { clearTokenCache } from "@/lib/client-api"

/**
 * Drops every piece of client state scoped to the current session: the cached
 * API token, React Query data and router loader data. Must run whenever the
 * session identity changes (sign-out, sign-in, sign-up); otherwise a different
 * user — possibly with another role — would see the previous user's data until
 * each query happens to refetch.
 */
export function useClearSessionCache() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useCallback(() => {
    clearTokenCache()
    queryClient.clear()
    router.clearCache()
  }, [queryClient, router])
}
