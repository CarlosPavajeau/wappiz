import { PostHogProvider } from "@posthog/react"
import type { QueryClient } from "@tanstack/react-query"
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { NuqsAdapter } from "nuqs/adapters/tanstack-router"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/hooks/use-theme"

import appCss from "@/index.css?url"
import geist from "@fontsource-variable/geist/wght.css?url"

export type RouterAppContext = {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootDocument,

  head: () => ({
    links: [
      {
        href: appCss,
        rel: "stylesheet",
      },
      {
        href: geist,
        rel: "stylesheet",
      },
    ],
    meta: [
      {
        charSet: "utf-8",
      },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      {
        content: "wappiz, citas, whatsapp, agendamiento",
        name: "keywords",
      },
      {
        title: "wappiz",
      },
    ],
  }),
})

function RootDocument() {
  return (
    <html lang="es" suppressHydrationWarning className="font-sans antialiased">
      <head>
        {/* Anti-flash: set correct theme class before CSS/React hydrate */}
        <script
          // intentional anti-flash inline script
          //
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cetus-theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`,
          }}
        />
        <HeadContent />
      </head>
      <body>
        <PostHogProvider
          apiKey={import.meta.env["VITE_PUBLIC_POSTHOG_KEY"]}
          options={{
            api_host: import.meta.env["VITE_PUBLIC_POSTHOG_HOST"],
            defaults: "2025-11-30",
          }}
        >
          <ThemeProvider>
            <TooltipProvider>
              <NuqsAdapter>
                <div className="grid h-svh grid-rows-[auto_1fr]">
                  <Outlet />
                </div>
                <Toaster richColors />
                <TanStackRouterDevtools position="bottom-right" />
              </NuqsAdapter>
            </TooltipProvider>
          </ThemeProvider>
        </PostHogProvider>
        <Analytics />
        <SpeedInsights />
        <Scripts />
      </body>
    </html>
  )
}
