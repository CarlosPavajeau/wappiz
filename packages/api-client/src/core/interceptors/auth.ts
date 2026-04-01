import type { AuthConfig, FetchRequestConfig } from "../types"

export type BaseFetchFn = <T>(
  config: FetchRequestConfig,
  extraHeaders?: Record<string, string>
) => Promise<T>

export function createAuthMiddleware(
  baseFetch: BaseFetchFn,
  config: AuthConfig
): <T>(config: FetchRequestConfig) => Promise<T> {
  const {
    tokenProvider,
    headerName = "Authorization",
    tokenPrefix = "Bearer",
  } = config

  return async <T>(requestConfig: FetchRequestConfig): Promise<T> => {
    if (requestConfig.skipAuth) {
      return baseFetch<T>(requestConfig)
    }

    const tokens = await tokenProvider()
    const authHeader = tokens?.accessToken
      ? { [headerName]: `${tokenPrefix} ${tokens.accessToken}` }
      : {}

    return baseFetch<T>(requestConfig, authHeader)
  }
}
