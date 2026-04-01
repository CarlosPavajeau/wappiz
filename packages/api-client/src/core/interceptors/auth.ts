import { ApiError } from "../types"
import type { AuthConfig, FetchRequestConfig, TokenPair } from "../types"

type FailedRequest = {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}

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
    onTokenUpdate,
    refresh,
    headerName = "Authorization",
    tokenPrefix = "Bearer",
  } = config

  let isRefreshing = false
  let failedQueue: FailedRequest[] = []

  const processQueue = (error: unknown, token: string | null): void => {
    for (const pending of failedQueue) {
      if (error || !token) {
        pending.reject(error)
      } else {
        pending.resolve(token)
      }
    }
    failedQueue = []
  }

  return async <T>(requestConfig: FetchRequestConfig): Promise<T> => {
    // Build auth header upfront (skip if skipAuth)
    let authHeader: Record<string, string> = {}
    if (!requestConfig.skipAuth) {
      const tokens = await tokenProvider()
      if (tokens?.accessToken) {
        authHeader = { [headerName]: `${tokenPrefix} ${tokens.accessToken}` }
      }
    }

    // No refresh config — just inject header and send
    if (!refresh || requestConfig.skipAuth) {
      return baseFetch<T>(requestConfig, authHeader)
    }

    const {
      endpoint,
      buildBody = (refreshToken: string) => ({ refreshToken }),
      extractTokens = (data: unknown) => data as TokenPair,
    } = refresh

    try {
      return await baseFetch<T>(requestConfig, authHeader)
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error
      }

      // Don't retry the refresh endpoint itself to avoid infinite loops
      if (requestConfig.url === endpoint) {
        await onTokenUpdate?.(null)
        throw error
      }

      // Another refresh is in progress — queue this request
      if (isRefreshing) {
        return new Promise<T>((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              baseFetch<T>(requestConfig, {
                [headerName]: `${tokenPrefix} ${token}`,
              })
                .then(resolve)
                .catch(reject)
            },
            reject,
          })
        })
      }

      isRefreshing = true

      try {
        const currentTokens = await tokenProvider()
        if (!currentTokens?.refreshToken) {
          throw new Error("No refresh token available")
        }

        const refreshed = await baseFetch<unknown>(
          {
            method: "POST",
            url: endpoint,
            data: buildBody(currentTokens.refreshToken),
            skipAuth: true,
          },
          {}
        )

        const newTokens = extractTokens(refreshed)
        await onTokenUpdate?.(newTokens)

        processQueue(null, newTokens.accessToken)

        return baseFetch<T>(requestConfig, {
          [headerName]: `${tokenPrefix} ${newTokens.accessToken}`,
        })
      } catch (refreshError) {
        processQueue(refreshError, null)
        await onTokenUpdate?.(null)
        throw refreshError
      } finally {
        isRefreshing = false
      }
    }
  }
}
