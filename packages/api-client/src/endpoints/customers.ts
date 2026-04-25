import { defineResource } from "../core/define-resource"
import type { EndpointDefinition } from "../core/types"
import type { Customer, Incident } from "../types/customers"

const definitions = {
  block: {
    method: "POST",
    path: (id: string) => `/customers/${id}/block`,
  } as EndpointDefinition<void, void, string>,
  byId: {
    method: "GET",
    path: (id: string) => `/customers/${id}`,
  } as EndpointDefinition<Customer, void, string>,
  incidents: {
    method: "GET",
    path: (id: string) => `/customers/${id}/incidents`,
  } as EndpointDefinition<Incident[], void, string>,
  list: {
    method: "GET",
    path: "/customers",
  } as EndpointDefinition<Customer[]>,
  unblock: {
    method: "POST",
    path: (id: string) => `/customers/${id}/unblock`,
  } as EndpointDefinition<void, void, string>,
}

export const customersEndpoints = defineResource(definitions)
