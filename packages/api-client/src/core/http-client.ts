import axios from "axios"
import type { AxiosInstance } from "axios"

import { setupAuthInterceptor } from "./interceptors/auth"
import type { ApiClientConfig, EndpointDefinition, ResourceApi } from "./types"

type ResourceFactory<
  TDefs extends Record<string, EndpointDefinition<any, any, any>>,
> = (axios: AxiosInstance) => ResourceApi<TDefs>

type BoundResources<
  TRegistry extends Record<
    string,
    ResourceFactory<Record<string, EndpointDefinition>>
  >,
> = {
  [K in keyof TRegistry]: TRegistry[K] extends ResourceFactory<infer TDefs>
    ? ResourceApi<TDefs>
    : never
}

/**
 * Framework-agnostic HTTP client with auth management and resource binding.
 *
 * @example
 * ```ts
 * const client = new HttpClient({
 *   baseURL: "https://api.example.com",
 *   auth: {
 *     tokenProvider: () => getTokensFromCookies(),
 *     onTokenUpdate: (tokens) => saveTokensToCookies(tokens),
 *     refresh: { endpoint: "/auth/refresh" },
 *   },
 * });
 *
 * const api = client.bindResources({ orders: ordersResource, customers: customersResource });
 * const orders = await api.orders.list();
 * ```
 */
export class HttpClient {
  public readonly axios: AxiosInstance

  constructor(config: ApiClientConfig) {
    const {
      baseURL,
      auth,
      timeout = 10_000,
      headers = {},
      axiosConfig = {},
    } = config

    this.axios = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      paramsSerializer: (params) => {
        const parts: string[] = []
        for (const [key, value] of Object.entries(params)) {
          if (Array.isArray(value)) {
            for (const item of value) {
              parts.push(
                `${encodeURIComponent(key)}=${encodeURIComponent(item)}`
              )
            }
          } else if (value !== undefined && value !== null) {
            parts.push(
              `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
            )
          }
        }
        return parts.join("&")
      },
      timeout,
      ...axiosConfig,
    })

    if (auth) {
      setupAuthInterceptor(this.axios, auth)
    }
  }

  /**
   * Bind resource definitions to this client's Axios instance.
   * Returns a fully typed API object with expressive access patterns.
   */
  bindResources<
    TRegistry extends Record<
      string,
      ResourceFactory<Record<string, EndpointDefinition<any, any, any>>>
    >,
  >(registry: TRegistry): BoundResources<TRegistry> {
    const bound = {} as Record<string, unknown>

    for (const [name, factory] of Object.entries(registry)) {
      bound[name] = factory(this.axios)
    }

    return bound as BoundResources<TRegistry>
  }
}
