import { env } from "@wappiz/env/web"
import { PostHog } from "posthog-node"

let posthogClient: PostHog | null = null

// Returns null when PostHog is not configured, so callers can fall back
// instead of constructing a client without a key.
export function getPostHogClient() {
  const apiKey = env.VITE_PUBLIC_POSTHOG_KEY
  if (!apiKey) {
    return null
  }

  if (!posthogClient) {
    posthogClient = new PostHog(apiKey, {
      flushAt: 1,
      flushInterval: 0,
      host: env.VITE_PUBLIC_POSTHOG_HOST,
    })
  }
  return posthogClient
}
