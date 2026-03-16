"use client"

import { ChevronDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type FilterSelectItem = {
  id: string
  label: string
}

type FilterSelectProps = {
  label: string
  items: FilterSelectItem[]
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  isLoading?: boolean
  className?: string
}

export function FilterSelect({
  label,
  items,
  selectedIds,
  onSelectedIdsChange,
  isLoading = false,
  className,
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
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          className
        )}
      >
        {label}
        {count > 0 && <Badge className="ml-0.5">{count}</Badge>}
        <ChevronDown className="text-muted-foreground ml-auto" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 gap-0 p-1.5">
        {isLoading ? (
          <p className="text-muted-foreground px-2 py-1.5 text-xs">
            Cargando...
          </p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground px-2 py-1.5 text-xs">
            Sin opciones
          </p>
        ) : (
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.id}>
                <label className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm select-none">
                  <Checkbox
                    checked={selectedIds.includes(item.id)}
                    onCheckedChange={() => toggle(item.id)}
                  />
                  <span className="truncate">{item.label}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
