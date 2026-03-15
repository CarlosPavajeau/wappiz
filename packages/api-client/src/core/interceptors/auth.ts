import type { AxiosInstance, InternalAxiosRequestConfig } from "axios"

import type { AuthConfig, TokenPair } from "../types"

type FailedRequest = {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}

export function setupAuthInterceptor(
  axios: AxiosInstance,
  config: AuthConfig
): void {
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

  axios.interceptors.request.use(
    async (request: InternalAxiosRequestConfig) => {
      if (
        (request as InternalAxiosRequestConfig & { skipAuth?: boolean })
          .skipAuth
      ) {
        return request
      }

      const tokens = await tokenProvider()
      if (tokens?.accessToken) {
        request.headers.set(headerName, `${tokenPrefix} ${tokens.accessToken}`)
      }

      return request
    }
  )

  if (!refresh) {
    return
  }

  const {
    endpoint,
    buildBody = (refreshToken: string) => ({ refreshToken }),
    extractTokens = (data: unknown) => data as TokenPair,
  } = refresh

  axios.interceptors.response.use(undefined, async (error) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & {
          _retried?: boolean
          skipAuth?: boolean
        })
      | undefined

    if (
      !originalRequest ||
      error.response?.status !== 401 ||
      originalRequest._retried
    ) {
      throw error
    }

    // Don't retry auth endpoints to avoid infinite loops
    if (originalRequest.url === endpoint) {
      await onTokenUpdate?.(null)
      throw error
    }

    if (isRefreshing) {
      // Queue this request until refresh completes
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ reject, resolve })
      }).then((token) => {
        originalRequest.headers.set(headerName, `${tokenPrefix} ${token}`)
        return axios(originalRequest)
      })
    }

    isRefreshing = true
    originalRequest._retried = true

    try {
      const currentTokens = await tokenProvider()
      if (!currentTokens?.refreshToken) {
        throw new Error("No refresh token available")
      }

      const response = await axios.post(
        endpoint,
        buildBody(currentTokens.refreshToken),
        {
          skipAuth: true,
        } as InternalAxiosRequestConfig & { skipAuth: boolean }
      )

      const newTokens = extractTokens(response.data)
      await onTokenUpdate?.(newTokens)

      processQueue(null, newTokens.accessToken)

      originalRequest.headers.set(
        headerName,
        `${tokenPrefix} ${newTokens.accessToken}`
      )
      return axios(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      await onTokenUpdate?.(null)
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  })
}
