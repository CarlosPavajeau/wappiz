import { defineResource } from "../core/define-resource"
import type { EndpointDefinition } from "../core/types"
import type {
  AssignServicesRequest,
  CreateResourceRequest,
  CreateScheduleOverrideRequest,
  DeleteScheduleOverrideRequest,
  Resource,
  ScheduleOverride,
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
  createOverride: {
    method: "POST",
    path: (id: string) => `/resources/${id}/overrides`,
  } as EndpointDefinition<
    ScheduleOverride,
    CreateScheduleOverrideRequest,
    string
  >,
  deleteOverride: {
    method: "DELETE",
    path: ({ resourceId, overrideId }: DeleteScheduleOverrideRequest) =>
      `/resources/${resourceId}/overrides/${overrideId}`,
  } as EndpointDefinition<void, void, DeleteScheduleOverrideRequest>,
  get: {
    method: "GET",
    path: (id: string) => `/resources/${id}`,
  } as EndpointDefinition<Resource, void, string>,
  list: {
    method: "GET",
    path: "/resources",
  } as EndpointDefinition<Resource[]>,
  listOverrides: {
    method: "GET",
    path: (id: string) => `/resources/${id}/overrides`,
  } as EndpointDefinition<ScheduleOverride[], void, string>,
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
