import tailwindcss from "@tailwindcss/vite"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

// Kept apart from vite.config.ts: the Start, Nitro and Sentry plugins there
// build the app and are not needed to run unit tests.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // Plain logic runs in Node; components render in a real browser so they
    // see actual layout, focus and events instead of a simulated DOM.
    projects: [
      {
        extends: true,
        test: {
          include: ["src/**/*.spec.ts"],
          name: "unit",
        },
      },
      {
        extends: true,
        // Specs mock the API client, but the dependency optimizer still crawls
        // it into Start's server entry, which only resolves inside the app build.
        optimizeDeps: {
          exclude: ["@tanstack/react-start"],
        },
        plugins: [tailwindcss()],
        test: {
          browser: {
            enabled: true,
            headless: true,
            instances: [{ browser: "chromium" }],
            provider: playwright(),
          },
          include: ["src/**/*.spec.tsx"],
          name: "browser",
          setupFiles: ["src/test/browser-setup.ts"],
        },
      },
    ],
  },
})
