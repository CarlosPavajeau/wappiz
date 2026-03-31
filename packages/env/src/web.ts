import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
  client: {
    VITE_API_URL: z.string(),
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  // oxlint-disable-next-line typescript/no-explicit-any
  runtimeEnv: (import.meta as any).env,
})
