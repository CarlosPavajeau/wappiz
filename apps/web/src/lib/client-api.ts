import { createApi } from "@wappiz/api-client"
import { env } from "@wappiz/env/web"
import Cookies from "js-cookie"

export const api = createApi({
  baseURL: env.NEXT_PUBLIC_API_URL,
  onTokenUpdate: (tokens) => {
    if (!tokens) {
      return
    }

    const { accessToken, refreshToken } = tokens

    Cookies.set("accessToken", accessToken, {
      secure: true,
    })
    Cookies.set("refreshToken", refreshToken, {
      secure: true,
    })
  },
  tokenProvider: () => {
    const accessToken = Cookies.get("accessToken")
    const refreshToken = Cookies.get("refreshToken")

    if (!accessToken || !refreshToken) {
      return null
    }

    return { accessToken, refreshToken }
  },
})
