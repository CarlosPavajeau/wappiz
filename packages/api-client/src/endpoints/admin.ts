import { defineResource } from "../core/define-resource"
import type { EndpointDefinition } from "../core/types"
import type {
  ActivateRequest,
  PendingActivationsResponse,
  RejectRequest,
} from "../types/admin"

const definitions = {
  activate: {
    method: "POST",
    path: (id: string) => `admin/activations/${id}/activate`,
  } as EndpointDefinition<void, ActivateRequest, string>,

  pendingActivations: {
    method: "GET",
    path: "/admin/activations",
  } as EndpointDefinition<PendingActivationsResponse[], undefined>,

  reject: {
    method: "POST",
    path: (id: string) => `admin/activations/${id}/reject`,
  } as EndpointDefinition<void, RejectRequest, string>,
} as const

export const adminResource = defineResource(definitions)
