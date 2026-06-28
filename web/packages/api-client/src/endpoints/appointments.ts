import { defineResource } from "../core/define-resource"
import type { EndpointDefinition } from "../core/types"
import type {
  Appointment,
  AppointmentStatusHistory,
  CreateAppointmentRequest,
  CreateAppointmentResponse,
  RescheduleAppointmentRequest,
  UpdateAppointmentStatusRequest,
} from "../types/appointments"

const createDefinition: EndpointDefinition<
  CreateAppointmentResponse,
  CreateAppointmentRequest
> = {
  method: "POST",
  path: "/appointments",
}

const historyDefinition: EndpointDefinition<
  AppointmentStatusHistory[],
  void,
  string
> = {
  method: "GET",
  path: (id: string) => `/appointments/${id}/history`,
}

const listDefinition: EndpointDefinition<Appointment[], void> = {
  method: "GET",
  path: "/appointments",
}

const rescheduleDefinition: EndpointDefinition<
  void,
  RescheduleAppointmentRequest,
  string
> = {
  method: "PUT",
  path: (id: string) => `/appointments/${id}/reschedule`,
}

const updateStatusDefinition: EndpointDefinition<
  void,
  UpdateAppointmentStatusRequest,
  string
> = {
  method: "PUT",
  path: (id: string) => `/appointments/${id}/status`,
}

const definitions = {
  create: createDefinition,
  history: historyDefinition,
  list: listDefinition,
  reschedule: rescheduleDefinition,
  updateStatus: updateStatusDefinition,
}

export const appointmentsEndpoints = defineResource(definitions)
