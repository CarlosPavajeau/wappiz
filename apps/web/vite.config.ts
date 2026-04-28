import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite"
import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
        filter: ({ path }) => !path.startsWith("/dashboard"),
      },
      sitemap: {
        enabled: true,
        host: "https://wappiz.cantte.com/",
      },
      pages: [
        {
          path: "/",
          prerender: {
            enabled: true,
            crawlLinks: true,
          },
        },
      ],
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
