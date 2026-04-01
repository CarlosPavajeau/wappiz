import { ApiError } from "./types"
import type {
  EndpointDefinition,
  FetchClient,
  HttpMethod,
  RequestOptions,
  ResourceApi,
} from "./types"

const METHODS_WITH_BODY = new Set<HttpMethod>(["POST", "PUT", "PATCH"])

/**
 * Create a type-safe resource from endpoint definitions.
 *
 * @example
 * ```ts
 * const ordersResource = defineResource({
 *   list: { method: "GET", path: "/orders" },
 *   getById: { method: "GET", path: (p: { id: string }) => `/orders/${p.id}` },
 *   create: { method: "POST", path: "/orders" },
 * });
 *
 * // Later, bind to a client instance:
 * const orders = ordersResource(client);
 * const data = await orders.list();
 * const order = await orders.getById({ id: "123" });
 * ```
 */
export function defineResource<
  TDefs extends Record<string, EndpointDefinition<any, any, any>>,
>(definitions: TDefs): (client: FetchClient) => ResourceApi<TDefs> {
  return (client: FetchClient) => {
    const resource = {} as Record<string, Function>

    for (const [name, def] of Object.entries(definitions)) {
      resource[name] = createEndpointFn(client, def)
    }

    return resource as ResourceApi<TDefs>
  }
}

function createEndpointFn(
  client: FetchClient,
  def: EndpointDefinition
): Function {
  const hasBody = METHODS_WITH_BODY.has(def.method)
  const hasDynamicPath = typeof def.path === "function"

  return async (...args: unknown[]) => {
    let argIndex = 0
    let resolvedPath: string
    let body: unknown
    let options: RequestOptions = {}

    // Resolve path (consumes params arg if dynamic)
    if (hasDynamicPath) {
      const params = args[argIndex++]
      resolvedPath = (def.path as Function)(params)
    } else {
      resolvedPath = def.path as string
    }

    // Resolve body (consumes body arg if method supports it)
    if (hasBody) {
      body = args[argIndex++]
    }

    // Remaining arg is options
    if (argIndex < args.length && args[argIndex] != null) {
      options = args[argIndex] as RequestOptions
    }

    const { skipAuth, params, headers, signal } = options

    try {
      return await client.request({
        method: def.method,
        url: resolvedPath,
        ...(body !== undefined && { data: body }),
        ...(params !== undefined && { params }),
        ...(headers !== undefined && { headers }),
        ...(signal !== undefined && { signal }),
        ...(skipAuth !== undefined && { skipAuth }),
      })
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw ApiError.fromError(error)
    }
  }
}
