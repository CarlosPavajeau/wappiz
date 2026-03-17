import { Loading03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  const { strokeWidth, ...rest } = props
  const finalStroke = strokeWidth ? Number(strokeWidth) : 2

  return (
    <HugeiconsIcon
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      icon={Loading03Icon}
      role="status"
      strokeWidth={finalStroke}
      {...rest}
    />
  )
}

export { Spinner }
