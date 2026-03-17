import { HttpClient } from "./core/http-client"
import type { ApiClientConfig, TokenPair } from "./core/types"
import { adminResource } from "./endpoints/admin"
import { appointmentsEndpoints } from "./endpoints/appointments"
import { authResource } from "./endpoints/auth"
import { onboardingResource } from "./endpoints/onboarding"
import { resourcesEndpoints } from "./endpoints/resources"
import { servicesEndpoint } from "./endpoints/services"
import { tenantEndpoints } from "./endpoints/tenants"

const RESOURCES = {
  admin: adminResource,
  appointments: appointmentsEndpoints,
  auth: authResource,
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
 * // Server-side
 * const api = createClient({
 *   baseURL: API_URL,
 *   auth: {
 *     tokenProvider: () => getTokensFromCookies(),
 *     onTokenUpdate: (tokens) => setTokenCookies(tokens),
 *     refresh: { endpoint: "/auth/refresh" },
 *   },
 * });
 *
 * // Client-side (React component via context)
 * const api = createClient({
 *   baseURL: API_URL,
 *   auth: {
 *     tokenProvider: () => getTokensFromStore(),
 *     onTokenUpdate: (tokens) => updateStore(tokens),
 *     refresh: { endpoint: "/auth/refresh" },
 *   },
 * });
 *
 * // Usage — expressive and fully typed
 * const { accessToken } = await api.auth.login({ email, password });
 * const { data: services } = await api.services.list();
 * ```
 */
export function createClient(config: ApiClientConfig) {
  const client = new HttpClient(config)
  return client.bindResources(RESOURCES)
}

export type ClientOptions = {
  baseURL: string
  tokenProvider: () => TokenPair | null | Promise<TokenPair | null>
  onTokenUpdate?: (tokens: TokenPair | null) => void | Promise<void>
  timeout?: number
  headers?: Record<string, string>
}

/**
 * Simplified factory with refresh flow pre-configured.
 * Uses the standard `/auth/refresh` endpoint and token shape.
 */
export function createApi(options: ClientOptions) {
  const { baseURL, tokenProvider, onTokenUpdate, timeout, headers } = options

  return createClient({
    auth: {
      onTokenUpdate,
      refresh: {
        buildBody: (refreshToken) => ({ refreshToken }),
        endpoint: "/auth/refresh",
        extractTokens: (data) => {
          const d = data as { accessToken: string; refreshToken: string }
          return { accessToken: d.accessToken, refreshToken: d.refreshToken }
        },
      },
      tokenProvider,
    },
    baseURL,
    headers,
    timeout,
  })
}
