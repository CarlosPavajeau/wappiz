import { defineResource } from "../core/define-resource"
import type { EndpointDefinition } from "../core/types"
import type {
  AssignServicesRequest,
  CreateResourceRequest,
  Resource,
  UpdateWorkingHoursRequest,
} from "../types/resources"
import type { Service } from "../types/services"

const definitions = {
  assignService: {
    method: "PUT",
    path: (id: string) => `/resources/${id}/services`,
  } as EndpointDefinition<void, AssignServicesRequest, string>,
  create: {
    method: "POST",
    path: "/resources",
  } as EndpointDefinition<Resource, CreateResourceRequest>,
  get: {
    method: "GET",
    path: (id: string) => `/resources/${id}`,
  } as EndpointDefinition<Resource, void, string>,
  list: {
    method: "GET",
    path: "/resources",
  } as EndpointDefinition<Resource[]>,
  services: {
    method: "GET",
    path: (id: string) => `/resources/${id}/services`,
  } as EndpointDefinition<Service[], void, string>,
  updateWorkingHours: {
    method: "PUT",
    path: (id: string) => `/resources/${id}/working-hours`,
  } as EndpointDefinition<void, UpdateWorkingHoursRequest, string>,
}

export const resourcesEndpoints = defineResource(definitions)
