import { QueryClient } from "@tanstack/react-query"
import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"

import "./index.css"
import "@fontsource-variable/geist/wght.css"
import { DefaultLoader } from "./components/default-loader"
import { routeTree } from "./routeTree.gen"

export const getRouter = () => {
  const queryClient = new QueryClient()

  const router = createTanStackRouter({
    context: { queryClient },
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

  return router
}

declare module "@tanstack/react-router" {
  type Register = {
    router: ReturnType<typeof getRouter>
  }
}
