import { createAuthMiddleware } from "./interceptors/auth"
import { ApiError } from "./types"
import type {
  ApiClientConfig,
  EndpointDefinition,
  FetchClient,
  FetchRequestConfig,
  ResourceApi,
} from "./types"

type ResourceFactory<
  TDefs extends Record<string, EndpointDefinition<any, any, any>>,
> = (client: FetchClient) => ResourceApi<TDefs>

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

function buildUrl(
  baseURL: string,
  path: string,
  params?: FetchRequestConfig["params"]
): string {
  const base = baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const url = new URL(`${base}${normalizedPath}`)

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(key, String(item))
        }
      } else if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    }
  }

  return url.toString()
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
export class HttpClient implements FetchClient {
  private readonly baseURL: string
  private readonly defaultHeaders: Record<string, string>
  private readonly timeout: number
  private readonly _request: <T>(config: FetchRequestConfig) => Promise<T>

  constructor(config: ApiClientConfig) {
    const { baseURL, auth, timeout = 10_000, headers = {} } = config

    this.baseURL = baseURL
    this.timeout = timeout
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...headers,
    }

    const baseFetch = <T>(
      fetchConfig: FetchRequestConfig,
      extraHeaders?: Record<string, string>
    ): Promise<T> => this._doFetch<T>(fetchConfig, extraHeaders)

    this._request = auth
      ? createAuthMiddleware(baseFetch, auth)
      : (fetchConfig) => baseFetch(fetchConfig)
  }

  private async _doFetch<T>(
    config: FetchRequestConfig,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    const url = buildUrl(this.baseURL, config.url, config.params)
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort("timeout"),
      this.timeout
    )

    const signal = config.signal
      ? AbortSignal.any([config.signal, controller.signal])
      : controller.signal

    try {
      const response = await fetch(url, {
        body:
          config.data !== undefined ? JSON.stringify(config.data) : undefined,
        headers: {
          ...this.defaultHeaders,
          ...config.headers,
          ...extraHeaders,
        },
        method: config.method,
        signal,
      })

      clearTimeout(timeoutId)

      const text = await response.text()
      let data: unknown = null
      if (text) {
        try {
          data = JSON.parse(text)
        } catch {
          data = text
        }
      }

      if (!response.ok) {
        const errorData = typeof data === "object" && data !== null ? data : {}
        throw new ApiError(
          ((errorData as Record<string, unknown>).message as string) ??
            response.statusText,
          response.status,
          (errorData as Record<string, unknown>).code as string | undefined,
          data
        )
      }

      return data as T
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof ApiError) {
        throw error
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiError("Request timed out", 0, "TIMEOUT", undefined, error)
      }
      throw ApiError.fromError(error)
    }
  }

  request<T>(config: FetchRequestConfig): Promise<T> {
    return this._request<T>(config)
  }

  /**
   * Bind resource definitions to this client instance.
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
      bound[name] = factory(this)
    }

    return bound as BoundResources<TRegistry>
  }
}
