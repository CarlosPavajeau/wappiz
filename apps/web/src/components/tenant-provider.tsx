"use client"

import { useQuery } from "@tanstack/react-query"
import type { Tenant } from "@wappiz/api-client/types/tenants"
import { createContext, use, useMemo } from "react"

import { authClient } from "@/lib/auth-client"
import { api } from "@/lib/client-api"

type TenantContext = {
  tenant: Tenant | undefined
  isLoading: boolean
}

export const tenantContext = createContext<TenantContext>({
  isLoading: false,
  tenant: undefined,
})

type TenantProviderProps = {
  children: React.ReactNode
}

export const TenantProvider = ({ children }: TenantProviderProps) => {
  const { data, isPending } = authClient.useSession()
  const shouldFetch = !isPending && data?.user.role !== "admin"

  const { data: tenant, isLoading } = useQuery({
    enabled: shouldFetch,
    queryFn: () => api.tenants.byUser(),
    queryKey: ["tenant"],
    staleTime: 5 * 60 * 1000,
  })

  const contextValue = useMemo(
    () => ({ isLoading, tenant }),
    [tenant, isLoading]
  )

  return (
    <tenantContext.Provider value={contextValue}>
      {children}
    </tenantContext.Provider>
  )
}
