import { env } from "@wappiz/env/web"
import { PostHog } from "posthog-node"

let posthogClient: PostHog | null = null

export function getPostHogClient() {
  if (!posthogClient) {
    posthogClient = new PostHog(env.VITE_PUBLIC_POSTHOG_KEY, {
      flushAt: 1,
      flushInterval: 0,
      host: env.VITE_PUBLIC_POSTHOG_HOST,
    })
  }
  return posthogClient
}
