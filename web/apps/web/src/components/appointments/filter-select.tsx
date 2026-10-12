"use client"

import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { FilterChecklist } from "@/components/appointments/filter-checklist"
import type { FilterItem } from "@/components/appointments/filter-checklist"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type FilterSelectProps = {
  label: string
  items: FilterItem[]
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  isLoading?: boolean
}

export function FilterSelect({
  label,
  items,
  selectedIds,
  onSelectedIdsChange,
  isLoading = false,
}: FilterSelectProps) {
  const count = selectedIds.length

  return (
    <Popover>
      <PopoverTrigger
        disabled={isLoading}
        render={
          <Button variant="outline" size="sm">
            {label}
            {count > 0 && (
              <Badge
                className="ml-0.5 h-4.5 min-w-4.5 rounded-sm px-1 py-px text-[0.625rem] leading-none"
                variant="secondary"
              >
                {count}
              </Badge>
            )}
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              data-icon="inline-end"
              strokeWidth={2}
            />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-56 gap-0 p-1.5">
        <FilterChecklist
          listClassName="max-h-72 overflow-y-auto"
          items={items}
          label={label}
          selectedIds={selectedIds}
          onSelectedIdsChange={onSelectedIdsChange}
        />
      </PopoverContent>
    </Popover>
  )
}
