import { defineResource } from "../core/define-resource"
import type { EndpointDefinition } from "../core/types"
import type { Plan } from "../types/billing"

const definitions = {
  listPlans: {
    method: "GET",
    path: "/plans",
  } as EndpointDefinition<Plan[]>,
}

export const billingEndpoints = defineResource(definitions)
