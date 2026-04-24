import { HttpClient } from "./core/http-client"
import { ApiError } from "./core/types"
import type { ApiClientConfig, ProblemDetail, TokenPair } from "./core/types"

export { ApiError }
export type { ProblemDetail }

import { adminResource } from "./endpoints/admin"
import { appointmentsEndpoints } from "./endpoints/appointments"
import { billingEndpoints } from "./endpoints/billings"
import { customersEndpoints } from "./endpoints/customers"
import { onboardingResource } from "./endpoints/onboarding"
import { resourcesEndpoints } from "./endpoints/resources"
import { servicesEndpoint } from "./endpoints/services"
import { tenantEndpoints } from "./endpoints/tenants"

const RESOURCES = {
  admin: adminResource,
  appointments: appointmentsEndpoints,
  billing: billingEndpoints,
  customers: customersEndpoints,
  onboarding: onboardingResource,
  resources: resourcesEndpoints,
  services: servicesEndpoint,
  tenants: tenantEndpoints,
} as const

export type Api = ReturnType<typeof createClient>

/**
 * Create a fully typed API client.
 *
 * @example
 * ```ts
 * const api = createClient({
 *   baseURL: API_URL,
 *   auth: {
 *     tokenProvider: () => getToken(),
 *   },
 * });
 *
 * const orders = await api.orders.list();
 * ```
 */
export function createClient(config: ApiClientConfig) {
  const client = new HttpClient(config)
  return client.bindResources(RESOURCES)
}

export type ClientOptions = {
  baseURL: string
  tokenProvider: () => TokenPair | null | Promise<TokenPair | null>
  timeout?: number
  headers?: Record<string, string>
}

/**
 * Simplified factory for token-based auth without refresh.
 */
export function createApi(options: ClientOptions) {
  const { baseURL, tokenProvider, timeout, headers } = options

  return createClient({
    auth: { tokenProvider },
    baseURL,
    headers,
    timeout,
  })
}
