import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite"
import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import { defineConfig } from "vite"

// These pages depend on the visitor's session (call to action, redirect to the
// dashboard), so they must render per request instead of at build time.
const sessionAwarePaths = new Set(["/", "/sign-in", "/sign-up"])

// Sections under the `_authed` layout. Prerendering them without a session
// makes the build follow the redirect and store another page's HTML instead.
const authedSections = ["/dashboard", "/onboarding", "/banned"]

const shouldPrerender = (path: string) => {
  // Crawled links may carry a query string or a trailing slash.
  const { pathname } = new URL(path, "http://localhost")
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname
  const isAuthed = authedSections.some(
    (section) => normalized === section || normalized.startsWith(`${section}/`)
  )
  return !isAuthed && !sessionAwarePaths.has(normalized)
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
        filter: ({ path }) => shouldPrerender(path),
      },
      sitemap: {
        enabled: true,
        host: "https://wappiz.cantte.com/",
      },
    }),
    sentryTanstackStart({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: "cantte",
      project: "wappiz",
    }),
    nitro(),
    viteReact(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3001,
  },
})
