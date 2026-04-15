import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/client-api"

export const onboardingProgressQuery = queryOptions({
  queryFn: () => api.onboarding.progress(),
  queryKey: ["onboarding", "progress"],
  staleTime: 5 * 60 * 1000,
})
