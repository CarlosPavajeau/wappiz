import { polarClient } from "@polar-sh/better-auth/client"
import { adminClient, jwtClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    jwtClient({
      jwks: {
        jwksPath: "/.well-known/jwks.json",
      },
    }),
    polarClient(),
  ],
})
