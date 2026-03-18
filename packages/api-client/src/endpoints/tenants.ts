import { defineResource } from "../core/define-resource"
import type { EndpointDefinition } from "../core/types"
import type { CreateTenantRequest, Tenant } from "../types/tenants"

const definitions = {
  byUser: {
    method: "GET",
    path: "/tenants/by-user",
  } as EndpointDefinition<Tenant>,
  create: {
    method: "POST",
    path: "/tenants",
  } as EndpointDefinition<Tenant, CreateTenantRequest>,
  me: {
    method: "GET",
    path: "/tenants/me",
  } as EndpointDefinition<Tenant>,
}

export const tenantEndpoints = defineResource(definitions)
