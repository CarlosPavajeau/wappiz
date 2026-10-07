import { PostHogProvider } from "@posthog/react"
import { env } from "@wappiz/env/web"
import type { ReactNode } from "react"

// Mounts PostHog only when it is configured. Without it, PostHog hooks fall
// back to an uninitialised client: captures are dropped and flags read as
// undefined, so flag-gated UI stays hidden.
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const apiKey = env.VITE_PUBLIC_POSTHOG_KEY
  if (!apiKey) {
    return children
  }

  return (
    <PostHogProvider
      apiKey={apiKey}
      options={{
        api_host: env.VITE_PUBLIC_POSTHOG_HOST,
        defaults: "2025-11-30",
      }}
    >
      {children}
    </PostHogProvider>
  )
}
