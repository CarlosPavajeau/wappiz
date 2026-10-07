import { useQuery } from "@tanstack/react-query"

import { useTenant } from "@/hooks/use-tenant"
import { billingEnabledQuery } from "@/queries/feature-flags"

export function useBillingEnabled() {
  const { data: tenant } = useTenant()
  const { data } = useQuery(billingEnabledQuery(tenant?.id))

  return data === true
}
