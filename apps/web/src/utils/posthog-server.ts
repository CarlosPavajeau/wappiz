import { PostHog } from "posthog-node"

let posthogClient: PostHog | null = null

export function getPostHogClient() {
  if (!posthogClient) {
    posthogClient = new PostHog(import.meta.env["VITE_PUBLIC_POSTHOG_KEY"], {
      flushAt: 1,
      flushInterval: 0,
      host: import.meta.env["VITE_PUBLIC_POSTHOG_HOST"],
    })
  }
  return posthogClient
}
