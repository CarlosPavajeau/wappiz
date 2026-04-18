import { Skeleton } from "@/components/ui/skeleton"

import type { CalView } from "./calendar-config"

export function CalendarSkeleton({ view }: { view: CalView }) {
  if (view === "month") {
    return (
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: 35 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: generated list
          <Skeleton key={i} className="h-[5.5rem] rounded-none" />
        ))}
      </div>
    )
  }
  return (
    <div className="flex">
      <div className="w-14 shrink-0 space-y-px">
        {Array.from({ length: 8 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: generated list
          <Skeleton key={i} className="h-16 rounded-none" />
        ))}
      </div>
      <div className="flex-1 space-y-px">
        {Array.from({ length: 8 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: generated list
          <Skeleton key={i} className="h-16 rounded-none" />
        ))}
      </div>
    </div>
  )
}
