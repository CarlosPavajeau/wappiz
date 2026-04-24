export type TokenPair = {
  accessToken: string
}

export type TokenProvider = () => TokenPair | null | Promise<TokenPair | null>

export type AuthConfig = {
  /** Async or sync function that returns the current token pair */
  tokenProvider: TokenProvider
  /** Header name for the access token @default "Authorization" */
  headerName?: string
  /** Token prefix @default "Bearer" */
  tokenPrefix?: string
}

export type ApiClientConfig = {
  baseURL: string
  auth?: AuthConfig
  /** Default timeout in ms @default 10000 */
  timeout?: number
  /** Additional default headers */
  headers?: Record<string, string>
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export type FetchRequestConfig = {
  method: HttpMethod
  url: string
  data?: unknown
  params?: Record<
    string,
    string | number | boolean | (string | number | boolean)[]
  >
  skipAuth?: boolean
  headers?: Record<string, string>
  signal?: AbortSignal
}

export type FetchClient = {
  request<T>(config: FetchRequestConfig): Promise<T>
}

export type RequestOptions = {
  /** Skip auth header injection for this request */
  skipAuth?: boolean
  params?: FetchRequestConfig["params"]
  headers?: Record<string, string>
  signal?: AbortSignal
}

export type ProblemDetail = {
  error: {
    detail: string
    status: number
    title: string
    type: string
  }
  meta: {
    requestId: string
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string | undefined
  readonly data: unknown
  readonly originalError?: unknown
  readonly requestId?: string

  constructor(
    message: string,
    status: number,
    code: string | undefined,
    data: unknown,
    originalError?: unknown,
    requestId?: string
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.data = data
    this.originalError = originalError
    this.requestId = requestId
  }

  static fromError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error
    }
    if (error instanceof Error) {
      return new ApiError(error.message, 0, undefined, undefined, error)
    }
    return new ApiError("Unknown error", 0, undefined, undefined, error)
  }
}

export type EndpointDefinition<
  TResponse = unknown,
  TBody = void,
  TParams = void,
> = {
  method: HttpMethod
  path: string | ((params: TParams) => string)
  _phantom?: { response: TResponse; body: TBody; params: TParams }
}

/**
 * Infer the callable signature from an endpoint definition.
 * - No body, no params → fn(options?) → Promise<TResponse>
 * - Body only → fn(body, options?) → Promise<TResponse>
 * - Params only → fn(params, options?) → Promise<TResponse>
 * - Body + Params → fn(params, body, options?) → Promise<TResponse>
 */
export type EndpointFn<TDef> =
  TDef extends EndpointDefinition<infer TRes, infer TBody, infer TParams>
    ? [TBody] extends [void]
      ? [TParams] extends [void]
        ? (options?: RequestOptions) => Promise<TRes>
        : (params: TParams, options?: RequestOptions) => Promise<TRes>
      : [TParams] extends [void]
        ? (body: TBody, options?: RequestOptions) => Promise<TRes>
        : (
            params: TParams,
            body: TBody,
            options?: RequestOptions
          ) => Promise<TRes>
    : never

export type ResourceApi<TDefs extends Record<string, EndpointDefinition>> = {
  [K in keyof TDefs]: EndpointFn<TDefs[K]>
}
