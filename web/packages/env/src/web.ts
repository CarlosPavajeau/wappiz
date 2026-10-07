import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
  client: {
    VITE_API_URL: z.string(),
    VITE_CLOUDFLARE_TURNSTILE_SITE_KEY: z.string(),
    // PostHog is optional: without a key analytics are off and every feature
    // flag reads as disabled.
    VITE_PUBLIC_POSTHOG_HOST: z.url().default("https://us.i.posthog.com"),
    VITE_PUBLIC_POSTHOG_KEY: z.string().optional(),
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  runtimeEnv: (import.meta as any).env,
})
