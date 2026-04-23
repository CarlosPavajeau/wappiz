import "dotenv/config"
import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    AUTH_GOOGLE_ID: z.string(),
    AUTH_GOOGLE_SECRET: z.string(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CLOUDFLARE_TURNSTILE_SECRET_KEY: z.string(),
    CORS_ORIGIN: z.url(),
    DATABASE_URL: z.string(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    POLAR_ACCESS_TOKEN: z.string(),
    POLAR_MODE: z.enum(["sandbox", "production"]).default("sandbox"),
    POLAR_WEBHOOK_SECRET: z.string(),
    RESEND_API_KEY: z.string(),
    RESEND_SEGMENT_ID: z.string(),
  },
})
