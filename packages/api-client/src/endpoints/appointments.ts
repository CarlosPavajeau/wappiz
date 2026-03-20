import { defineResource } from "../core/define-resource"
import type { EndpointDefinition } from "../core/types"
import type {
  Appointment,
  AppointmentStatusHistory,
  UpdateAppointmentStatusRequest,
} from "../types/appointments"

const definitions = {
  history: {
    method: "GET",
    path: (id: string) => `/appointments/${id}/history`,
  } as EndpointDefinition<AppointmentStatusHistory[], void, string>,
  list: {
    method: "GET",
    path: "/appointments",
  } as EndpointDefinition<Appointment[], void>,
  updateStatus: {
    method: "PUT",
    path: (id: string) => `/appointments/${id}/status`,
  } as EndpointDefinition<void, UpdateAppointmentStatusRequest, string>,
}

export const appointmentsEndpoints = defineResource(definitions)
