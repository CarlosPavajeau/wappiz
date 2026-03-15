import { defineResource } from "../core/define-resource"
import type { EndpointDefinition } from "../core/types"
import type { Appointment } from "../types/appointments"

const definitions = {
  list: {
    method: "GET",
    path: "/appointments",
  } as EndpointDefinition<Appointment[], void>,
}

export const appointmentsEndpoints = defineResource(definitions)
