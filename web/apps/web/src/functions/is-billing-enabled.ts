import { createServerFn } from "@tanstack/react-start"
import { type } from "arktype"

import { FeatureFlag } from "@/lib/feature-flags"
import { authMiddleware } from "@/middleware/auth"
import { getPostHogClient } from "@/utils/posthog-server"

const schema = type({
  tenantId: "string.uuid",
})

// Evaluated server-side with the tenant ID as distinct ID so the dashboard
// and the Go API agree on who has billing. Fails closed: any error hides it.
export const isBillingEnabled = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(schema)
  .handler(async ({ context, data }) => {
    if (!context.session) {
      return false
    }

    try {
      const enabled = await getPostHogClient().isFeatureEnabled(
        FeatureFlag.Billing,
        data.tenantId
      )
      return enabled === true
    } catch {
      return false
    }
  })
