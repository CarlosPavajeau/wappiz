import { ArrowRight01Icon, BubbleChatIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

export function NavigationBar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <HugeiconsIcon
              icon={BubbleChatIcon}
              strokeWidth={1.5}
              className="text-primary-foreground h-5 w-5"
              aria-hidden="true"
            />
          </div>
          <span className="text-lg font-semibold tracking-tight">wappiz</span>
        </div>
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
