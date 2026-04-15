import { HugeiconsIcon } from "@hugeicons/react"
import type { AppointmentStatus } from "@wappiz/api-client/types/appointments"

import { cn } from "@/lib/utils"

import { getStatusConfig } from "./appointment-utils"

const COLOR_CLASSES: Record<string, string> = {
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  blue: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  gray: "bg-muted text-muted-foreground",
  green: "bg-green-500/10 text-green-700 dark:text-green-400",
  red: "bg-red-500/10 text-red-700 dark:text-red-400",
  teal: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  yellow: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, color, icon } = getStatusConfig(status)

  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1 overflow-hidden rounded-4xl px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        COLOR_CLASSES[color]
      )}
    >
      <HugeiconsIcon className="size-3!" icon={icon} strokeWidth={2} />
      {label}
    </span>
  )
}
