import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
  client: {
    VITE_API_URL: z.string(),
    VITE_CLOUDFLARE_TURNSTILE_SITE_KEY: z.string(),
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  runtimeEnv: (import.meta as any).env,
})
