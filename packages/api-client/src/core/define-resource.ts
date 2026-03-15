import type { AxiosInstance } from "axios"

import { ApiError } from "./types"
import type {
  EndpointDefinition,
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
 * // Later, bind to an axios instance:
 * const orders = ordersResource(axiosInstance);
 * const data = await orders.list();
 * const order = await orders.getById({ id: "123" });
 * ```
 */
export function defineResource<
  TDefs extends Record<string, EndpointDefinition<any, any, any>>,
>(definitions: TDefs): (axios: AxiosInstance) => ResourceApi<TDefs> {
  return (axios: AxiosInstance) => {
    const resource = {} as Record<string, Function>

    for (const [name, def] of Object.entries(definitions)) {
      resource[name] = createEndpointFn(axios, def)
    }

    return resource as ResourceApi<TDefs>
  }
}

function createEndpointFn(
  axios: AxiosInstance,
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

    const { skipAuth, ...axiosOptions } = options

    try {
      const response = await axios.request({
        method: def.method,
        url: resolvedPath,
        ...(body !== undefined && { data: body }),
        ...axiosOptions,
        ...(skipAuth && { skipAuth }),
      })

      return response.data
    } catch (error) {
      throw ApiError.fromAxiosError(error)
    }
  }
}
