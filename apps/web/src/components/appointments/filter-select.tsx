"use client"

import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type FilterSelectItem = {
  id: string
  label: string
  color?: string
}

type FilterSelectProps = {
  label: string
  items: FilterSelectItem[]
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

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectedIdsChange(selectedIds.filter((x) => x !== id))
    } else {
      onSelectedIdsChange([...selectedIds, id])
    }
  }

  return (
    <DropdownMenu disabled={isLoading}>
      <DropdownMenuTrigger
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
      <DropdownMenuContent align="start" className="w-44 gap-0 p-1.5">
        <DropdownMenuGroup>
          {items.map((item) => (
            <DropdownMenuCheckboxItem
              key={item.id}
              checked={selectedIds.includes(item.id)}
              onCheckedChange={() => toggle(item.id)}
            >
              {Boolean(item.color) && (
                <div className={cn("size-2 rounded-full", item.color)} />
              )}
              {item.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
