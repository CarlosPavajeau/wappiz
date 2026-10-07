import { queryOptions, skipToken } from "@tanstack/react-query"

import { isBillingEnabled } from "@/functions/is-billing-enabled"

// Skipped until the tenant is known; the flag is evaluated per tenant.
export const billingEnabledQuery = (tenantId: string | undefined) =>
  queryOptions({
    queryFn: tenantId
      ? () => isBillingEnabled({ data: { tenantId } })
      : skipToken,
    queryKey: ["feature-flags", "billing", tenantId],
    staleTime: 5 * 60 * 1000,
  })
