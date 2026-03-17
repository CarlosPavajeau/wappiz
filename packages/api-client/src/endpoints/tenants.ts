import { defineResource } from "../core/define-resource"
import type { EndpointDefinition } from "../core/types"
import type { Tenant } from "../types/tenants"

const definitions = {
  me: {
    method: "GET",
    path: "/tenants/me",
  } as EndpointDefinition<Tenant>,
}

export const tenantEndpoints = defineResource(definitions)
