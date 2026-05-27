import { defineResource } from "../core/define-resource"
import type { EndpointDefinition } from "../core/types"
import type {
  TenantFlowField,
  UpsertTenantFlowFieldRequest,
} from "../types/tenant-flow-fields"

const createDefinition: EndpointDefinition<
  TenantFlowField,
  UpsertTenantFlowFieldRequest
> = {
  method: "POST",
  path: "/tenants/flow-fields",
}

const listDefinition: EndpointDefinition<TenantFlowField[]> = {
  method: "GET",
  path: "/tenants/flow-fields",
}

const toggleDefinition: EndpointDefinition<void, void, string> = {
  method: "PATCH",
  path: (id: string) => `/tenants/flow-fields/${id}/toggle`,
}

const updateDefinition: EndpointDefinition<
  void,
  UpsertTenantFlowFieldRequest,
  string
> = {
  method: "PUT",
  path: (id: string) => `/tenants/flow-fields/${id}`,
}

const definitions = {
  create: createDefinition,
  list: listDefinition,
  toggle: toggleDefinition,
  update: updateDefinition,
}

export const tenantFlowFieldEndpoints = defineResource(definitions)
