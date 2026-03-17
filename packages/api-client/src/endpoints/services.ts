import { defineResource } from "../core/define-resource"
import type { EndpointDefinition } from "../core/types"
import type {
  CreateServiceRequest,
  Service,
  UpdateServiceRequest,
} from "../types/services"

const definitions = {
  create: {
    method: "POST",
    path: "/services",
  } as EndpointDefinition<Service, CreateServiceRequest>,
  list: {
    method: "GET",
    path: "/services",
  } as EndpointDefinition<Service[]>,
  update: {
    method: "PUT",
    path: (id: string) => `/services/${id}`,
  } as EndpointDefinition<Service, UpdateServiceRequest, string>,
}

export const servicesEndpoint = defineResource(definitions)
