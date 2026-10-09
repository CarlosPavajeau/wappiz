import { createApi } from "@wappiz/api-client"
import { env } from "@wappiz/env/web"

import { getToken } from "@/functions/get-token"

type CachedToken = {
  value: string
  /** Milliseconds since epoch. */
  expiresAt: number
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
/**
 * The token fetch currently in flight, shared by every caller that misses the
 * cache at the same time; without it, a page firing several queries on an
 * empty or expired cache makes one token request per query.
 */
let inflight: Promise<string | null> | null = null

/** Aborts a request whose token fetch outlived the session that started it. */
export class SessionChangedError extends Error {
  constructor() {
    super("Session changed while the request was pending")
    this.name = "SessionChangedError"
  }
}

export function clearTokenCache(): void {
  cache = null
  // Dropping the shared fetch makes requests from the new session start their
  // own instead of joining one made with the previous session's cookies.
  inflight = null
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
  inflight ??= fetchToken()
  const pending = inflight
  let token: string | null
  try {
    token = await pending
  } finally {
    // A clear may have already replaced this fetch with a newer one.
    if (inflight === pending) {
      inflight = null
    }
  }
  if (startedAt !== generation) {
    // Session changed mid-flight. Retrying would send a request built by the
    // previous user (e.g. a form submission) under the new user's account, so
    // abort it instead; requests started by the new session fetch their own.
    throw new SessionChangedError()
  }
  return token
}

async function fetchToken(): Promise<string | null> {
  const startedAt = generation
  const token = await getToken()
  // A late response from a previous session must not repopulate the cache.
  if (startedAt !== generation) {
    return token
  }
  cache = token
    ? {
        expiresAt: parseJwtExpiry(token) ?? Date.now() + FALLBACK_TTL_MS,
        value: token,
      }
    : null
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
