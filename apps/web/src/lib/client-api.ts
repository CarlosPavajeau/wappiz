import { createApi } from "@wappiz/api-client"
import { env } from "@wappiz/env/web"

import { getToken } from "@/functions/get-token"

type CachedToken = {
  value: string
  expiresAt: number // ms timestamp
}

/** Fetch a new token 30s before actual expiry to avoid races. */
const EXPIRY_BUFFER_MS = 30_000
/** Fallback TTL when the JWT carries no exp claim. */
const FALLBACK_TTL_MS = 14 * 60 * 1000

let cache: CachedToken | null = null

export function clearTokenCache(): void {
  cache = null
}

function parseJwtExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return typeof payload.exp === "number" ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

async function getCachedToken(): Promise<string | null> {
  // Server: skip cache — every request has its own session headers.
  if (typeof window === "undefined") {
    return getToken()
  }

  const now = Date.now()
  if (cache !== null && cache.expiresAt - EXPIRY_BUFFER_MS > now) {
    return cache.value
  }

  const token = await getToken()
  if (!token) {
    cache = null
    return null
  }

  cache = {
    expiresAt: parseJwtExpiry(token) ?? now + FALLBACK_TTL_MS,
    value: token,
  }
  return token
}

export const api = createApi({
  baseURL: env.VITE_API_URL,
  tokenProvider: async () => {
    const token = await getCachedToken()
    if (!token) {
      return null
    }
    return { accessToken: token }
  },
})
