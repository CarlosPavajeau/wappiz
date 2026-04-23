import { defineResource } from "../core/define-resource"
import type { EndpointDefinition } from "../core/types"
import type { Plan } from "../types/billing"

const definitions = {
  getPlanByExternalId: {
    method: "GET",
    path: (externalId: string) => `/plans/by-external-id/${externalId}`,
  } as EndpointDefinition<Plan, void, string>,
  listPlans: {
    method: "GET",
    path: "/plans",
  } as EndpointDefinition<Plan[]>,
}

export const billingEndpoints = defineResource(definitions)
