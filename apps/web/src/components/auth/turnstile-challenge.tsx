import { Turnstile } from "@marsidev/react-turnstile"
import { env } from "@wappiz/env/web"
import { useState } from "react"

import { useTheme } from "@/hooks/use-theme"

import { Spinner } from "../ui/spinner"

type Props = {
  onSuccess: (token: string) => void
  onError: (error?: Error | string) => void
}

export function TurnstileChallenge({ onSuccess, onError }: Props) {
  const [isWidgetLoading, setIsWidgetLoading] = useState(true)
  const { resolvedTheme } = useTheme()
  const siteKey = env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY

  if (!siteKey) {
    if (onError) {
      onError(new Error("Turnstile not configured"))
    }
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-red-500">
          Turnstile no está configurado. Ponte en contacto con el servicio de
          asistencia.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center">
        <div className="relative h-16.25 w-75">
          {isWidgetLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md border backdrop-blur-xs">
              <div className="flex items-center gap-2">
                <Spinner />
                <span className="text-sm text-muted-foreground">
                  Cargando verificación...
                </span>
              </div>
            </div>
          )}

          <div className="h-full w-full">
            <Turnstile
              siteKey={siteKey}
              onWidgetLoad={() => {
                setIsWidgetLoading(false)
              }}
              onSuccess={(token) => {
                onSuccess(token)
              }}
              onError={(_error) => {
                setIsWidgetLoading(false)
                onError(new Error("Turnstile verification failed"))
              }}
              options={{
                size: "normal",
                theme: resolvedTheme,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
