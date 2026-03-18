"use client"

import { useQuery } from "@tanstack/react-query"
import type { Tenant } from "@wappiz/api-client/types/tenants"
import { createContext } from "react"

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
  const { data: tenant, isLoading } = useQuery({
    queryFn: () => api.tenants.byUser(),
    queryKey: ["tenant"],
    staleTime: 5 * 60 * 1000,
  })

  const contextValue = { isLoading, tenant }

  return (
    <tenantContext.Provider value={contextValue}>
      {children}
    </tenantContext.Provider>
  )
}
