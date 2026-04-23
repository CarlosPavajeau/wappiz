import * as Sentry from "@sentry/tanstackstart-react"
import { QueryClient } from "@tanstack/react-query"
import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"

import "./index.css"
import "@fontsource-variable/geist/wght.css"
import { DefaultLoader } from "./components/default-loader"
import { SentryErrorBoundary } from "./components/error-boundary"
import { routeTree } from "./routeTree.gen"

export const getRouter = () => {
  const queryClient = new QueryClient()

  const router = createTanStackRouter({
    context: { queryClient },
    defaultErrorComponent: SentryErrorBoundary,
    defaultPendingComponent: () => <DefaultLoader />,
    defaultPendingMinMs: 0,
    defaultPendingMs: 0,
    defaultPreloadStaleTime: 0,
    routeTree,
    scrollRestoration: true,
  })

  setupRouterSsrQueryIntegration({
    queryClient,
    router,
  })

  if (!router.isServer) {
    Sentry.init({
      dsn: "https://50a1ab369669e9a78b9d7647a820377c@o4503956764950528.ingest.us.sentry.io/4511237383585792",

      // Adds request headers and IP for users, for more info visit:
      // https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/configuration/options/#sendDefaultPii
      sendDefaultPii: true,

      integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
      tracesSampleRate: 0.25,
      enableLogs: true,
    })
  }

  return router
}

declare module "@tanstack/react-router" {
  type Register = {
    router: ReturnType<typeof getRouter>
  }
}
