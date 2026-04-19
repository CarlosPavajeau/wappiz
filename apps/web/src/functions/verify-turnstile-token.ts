import { createServerFn } from "@tanstack/react-start"
import { env } from "@wappiz/env/server"
import { type } from "arktype"

const schema = type({
  token: "string",
})

export const verifyTurnstileToken = createServerFn({ method: "POST" })
  .inputValidator(schema)
  .handler(async ({ data }) => {
    const secretKey = env.CLOUDFLARE_TURNSTILE_SECRET_KEY
    if (!secretKey) {
      return false
    }

    try {
      const response = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            secret: secretKey,
            response: data.token,
          }),
        }
      )

      if (!response.ok) {
        return false
      }

      const verification = await response.json()

      return verification.success === true
    } catch {
      return false
    }
  })
