// PostHog flag keys. Keep in sync with internal/services/featureflags in the
// Go API, which evaluates the same flags with the tenant ID as distinct ID.
export const FeatureFlag = {
  Billing: "billing",
} as const
