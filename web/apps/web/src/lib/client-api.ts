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
/**
 * Bumped on every clear so a token fetch that started under a previous session
 * can tell its response is stale. Without it, a late response would write the
 * old user's token back into the cache after sign-out/sign-in.
 */
let generation = 0

/** Aborts a request whose token fetch outlived the session that started it. */
export class SessionChangedError extends Error {
  constructor() {
    super("Session changed while the request was pending")
    this.name = "SessionChangedError"
  }
}

export function clearTokenCache(): void {
  cache = null
  generation += 1
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

  const startedAt = generation
  const token = await getToken()
  if (startedAt !== generation) {
    // Session changed mid-flight. Retrying would send a request built by the
    // previous user (e.g. a form submission) under the new user's account, so
    // abort it instead; requests started by the new session fetch their own.
    throw new SessionChangedError()
  }
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
