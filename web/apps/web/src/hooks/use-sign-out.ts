import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { useClearSessionCache } from "@/hooks/use-clear-session-cache"
import { authClient } from "@/lib/auth-client"

export function useSignOut() {
  const navigate = useNavigate()
  const clearSessionCache = useClearSessionCache()

  return useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: async () => {
      // Leave the authed routes first so their mounted queries don't refetch
      // against an empty cache with no session.
      await navigate({ to: "/sign-in" })
      clearSessionCache()
    },
  })
}
