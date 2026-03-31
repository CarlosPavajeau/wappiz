import { createApi } from "@wappiz/api-client"
import { env } from "@wappiz/env/web"

import { getToken } from "@/functions/get-token"

export const api = createApi({
  baseURL: env.VITE_API_URL,
  tokenProvider: async () => {
    const token = await getToken()

    if (!token) {
      return null
    }

    return { accessToken: token, refreshToken: token }
  },
})
