import { defineResource } from "../core/define-resource"
import type { EndpointDefinition } from "../core/types"
import type { CreateServiceRequest, Service } from "../types/services"

const definitions = {
  create: {
    method: "POST",
    path: "/services",
  } as EndpointDefinition<Service, CreateServiceRequest>,
  list: {
    method: "GET",
    path: "/services",
  } as EndpointDefinition<Service[]>,
}

export const servicesEndpoint = defineResource(definitions)
