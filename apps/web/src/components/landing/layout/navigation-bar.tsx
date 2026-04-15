import { BubbleChatIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

export function NavigationBar() {
  return (
    <nav
      aria-label="Navegación principal"
      className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          aria-label="wappiz — ir al inicio"
          className="flex items-center gap-2 transition-opacity hover:opacity-70"
        >
          <HugeiconsIcon
            icon={BubbleChatIcon}
            strokeWidth={1.5}
            className="h-5 w-5 text-primary"
            aria-hidden="true"
          />
          <span className="text-lg font-semibold tracking-tight">wappiz</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button
            render={<Link to="/sign-in" />}
            nativeButton={false}
            size="sm"
            variant="default"
          >
            Iniciar sesión
          </Button>
        </div>
      </div>
    </nav>
  )
}
