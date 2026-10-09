import { defineConfig } from "vitest/config"

// Kept apart from vite.config.ts: the Start, Nitro and Sentry plugins there
// build the app and are not needed to run unit tests.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
})
