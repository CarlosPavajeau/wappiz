import { createApi } from "@wappiz/api-client"
import { env } from "@wappiz/env/web"

import { authClient } from "./auth-client"

export const api = createApi({
  baseURL: env.NEXT_PUBLIC_API_URL,
  tokenProvider: async () => {
    const { data } = await authClient.token()

    if (!data) {
      return null
    }

    return { accessToken: data.token, refreshToken: data.token }
  },
})
