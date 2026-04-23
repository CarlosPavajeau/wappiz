import { defineResource } from "../core/define-resource"
import type { EndpointDefinition } from "../core/types"
import type { Plan } from "../types/billing"

const definitions = {
  listPlans: {
    method: "GET",
    path: "/plans",
  } as EndpointDefinition<Plan[]>,
  getPlanByExternalId: {
    method: "GET",
    path: (externalId: string) => `/plans/by-external-id/${externalId}`,
  } as EndpointDefinition<Plan, void, string>,
}

export const billingEndpoints = defineResource(definitions)
