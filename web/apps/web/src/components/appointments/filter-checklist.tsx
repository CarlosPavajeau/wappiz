import { useId, useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { includesText } from "@/lib/text"
import { cn } from "@/lib/utils"

export type FilterItem = {
  id: string
  label: string
  color?: string
}

/**
 * Short lists are faster to scan than to type into, so the search box only
 * shows up once a list grows past what fits comfortably on screen.
 */
export const FILTER_SEARCH_THRESHOLD = 8

type Props = {
  items: FilterItem[]
  label: string
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  className?: string
  listClassName?: string
}

/**
 * Checkbox list shared by the desktop filter popovers and the mobile filter
 * sheet. Selected items hidden by the search stay selected.
 */
export function FilterChecklist({
  items,
  label,
  selectedIds,
  onSelectedIdsChange,
  className,
  listClassName,
}: Props) {
  const idPrefix = useId()
  const [query, setQuery] = useState("")
  const searchable = items.length > FILTER_SEARCH_THRESHOLD
  const visible = searchable
    ? items.filter((item) => includesText(item.label, query))
    : items

  const toggle = (id: string, checked: boolean) => {
    onSelectedIdsChange(
      checked
        ? [...selectedIds, id]
        : selectedIds.filter((selected) => selected !== id)
    )
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {searchable && (
        <Input
          aria-label={`Buscar ${label.toLowerCase()}`}
          placeholder="Buscar"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      )}
      {visible.length === 0 ? (
        <p className="px-1.5 py-2 text-sm text-muted-foreground">
          Sin resultados
        </p>
      ) : (
        <ul aria-label={label} className={cn("flex flex-col", listClassName)}>
          {visible.map((item) => {
            const id = `${idPrefix}-${item.id}`
            return (
              <li
                key={item.id}
                className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-accent"
              >
                <Checkbox
                  id={id}
                  checked={selectedIds.includes(item.id)}
                  onCheckedChange={(checked) => toggle(item.id, checked)}
                />
                {Boolean(item.color) && (
                  <div
                    className={cn("size-2 shrink-0 rounded-full", item.color)}
                  />
                )}
                <label htmlFor={id} className="flex-1 cursor-pointer text-sm">
                  {item.label}
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
