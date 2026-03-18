"use server"

import { createApi } from "@wappiz/api-client"
import type { TokenPair } from "@wappiz/api-client/core/types/index"
import { auth } from "@wappiz/auth"
import { env } from "@wappiz/env/web"
import { headers } from "next/headers"

/**
 * Returns an `api` instance backed by a server-side ApiClient that reads the
 * access/refresh tokens from the Next.js cookie store.
 *
 * Token refresh is handled proactively by middleware before requests reach
 * Server Components. Cookies can only be written in Server Actions and Route
 * Handlers, so `onTokenUpdate` is intentionally omitted here.
 */
export async function getServerApi() {
  const baseURL = env.NEXT_PUBLIC_API_URL ?? ""
  const { token } = await auth.api.getToken({
    headers: await headers(),
  })

  const tokenProvider = () => {
    const accessToken = token
    const refreshToken = token
    return { accessToken, refreshToken } as TokenPair
  }

  const api = createApi({ baseURL, tokenProvider })

  return api
}
