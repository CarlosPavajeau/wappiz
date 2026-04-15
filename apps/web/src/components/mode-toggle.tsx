import { Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"

export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label="Cambiar tema"
            className="touch-manipulation gap-1.5"
          />
        }
      >
        <span className="relative flex size-4" aria-hidden="true">
          <HugeiconsIcon
            icon={Sun01Icon}
            className={cn(
              "absolute inset-0 size-4 transition-[transform,opacity] duration-200 motion-reduce:transition-none",
              isDark
                ? "scale-0 -rotate-90 opacity-0"
                : "scale-100 rotate-0 opacity-100"
            )}
          />
          <HugeiconsIcon
            icon={Moon02Icon}
            className={cn(
              "absolute inset-0 size-4 transition-[transform,opacity] duration-200 motion-reduce:transition-none",
              isDark
                ? "scale-100 rotate-0 opacity-100"
                : "scale-0 rotate-90 opacity-0"
            )}
          />
        </span>
        <Kbd className="hidden sm:inline-flex">d</Kbd>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Oscuro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
