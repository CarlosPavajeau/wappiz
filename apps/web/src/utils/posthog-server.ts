import { PostHog } from "posthog-node"

let posthogClient: PostHog | null = null

export function getPostHogClient() {
  if (!posthogClient) {
    posthogClient = new PostHog(import.meta.env["VITE_PUBLIC_POSTHOG_KEY"], {
      host: import.meta.env["VITE_PUBLIC_POSTHOG_HOST"],
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return posthogClient
}
