"use server"

import { getRequestHeaders } from "@tanstack/react-start/server"
import { createApi } from "@wappiz/api-client"
import type { TokenPair } from "@wappiz/api-client/core/types/index"
import { auth } from "@wappiz/auth"
import { env } from "@wappiz/env/web"

/**
 * Returns an `api` instance backed by a server-side ApiClient.
 */
export async function getServerApi() {
  const baseURL = env.VITE_API_URL ?? ""
  const { token } = await auth.api.getToken({
    headers: await getRequestHeaders(),
  })

  const tokenProvider = () => {
    const accessToken = token
    const refreshToken = token
    return { accessToken, refreshToken } as TokenPair
  }

  const api = createApi({ baseURL, tokenProvider })

  return api
}
