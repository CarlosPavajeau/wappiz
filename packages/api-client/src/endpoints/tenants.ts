import { defineResource } from "../core/define-resource"
import type { EndpointDefinition } from "../core/types"
import type {
  CreateTenantRequest,
  Tenant,
  UpdateTenantSettingsRequest,
} from "../types/tenants"

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
  updateSettings: {
    method: "PUT",
    path: "/tenants/settings",
  } as EndpointDefinition<void, UpdateTenantSettingsRequest>,
}

export const tenantEndpoints = defineResource(definitions)
