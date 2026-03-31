import { createIsomorphicFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { auth } from "@wappiz/auth"

import { authClient } from "@/lib/auth-client"

export const getToken = createIsomorphicFn()
  .server(async () => {
    const { token } = await auth.api.getToken({
      headers: await getRequestHeaders(),
    })
    return token
  })
  .client(async () => {
    const { data } = await authClient.token()

    if (!data) {
      return null
    }

    return data.token
  })
