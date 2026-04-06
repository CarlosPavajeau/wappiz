"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ApiError } from "@wappiz/api-client"
import { useState } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"

import { ThemeProvider } from "./theme-provider"
import { Toaster } from "./ui/sonner"

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 1000 * 60 * 5,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Don't retry on 500 errors
              if (
                error instanceof ApiError &&
                (error as ApiError).status === 500
              ) {
                return false
              }
              return failureCount < 2
            },
            staleTime: 1000 * 60,
          },
        },
      })
  )

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster richColors />
        </QueryClientProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
