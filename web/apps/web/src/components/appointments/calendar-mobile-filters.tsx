import type { ReactNode } from "react"

import { FilterChecklist } from "@/components/appointments/filter-checklist"
import type { FilterItem } from "@/components/appointments/filter-checklist"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import { STATUS_ITEMS } from "./calendar-config"

type NamedItem = {
  id: string
  name: string
}

type Props = {
  resources: NamedItem[] | undefined
  services: NamedItem[] | undefined
  isLoadingResources: boolean
  isLoadingServices: boolean
  resourceIds: string[]
  serviceIds: string[]
  statuses: string[]
  filterCount: number
  onResourceIdsChange: (ids: string[]) => void
  onServiceIdsChange: (ids: string[]) => void
  onStatusesChange: (ids: string[]) => void
}

export function CalendarMobileFilters({
  resources,
  services,
  isLoadingResources,
  isLoadingServices,
  resourceIds,
  serviceIds,
  statuses,
  filterCount,
  onResourceIdsChange,
  onServiceIdsChange,
  onStatusesChange,
}: Props) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="md:hidden"
            aria-label="Abrir filtros"
          >
            Filtros
            {filterCount > 0 && (
              <Badge
                className="ml-0.5 h-4.5 min-w-4.5 rounded-sm px-1 py-px text-[0.625rem] leading-none"
                variant="secondary"
              >
                {filterCount}
              </Badge>
            )}
          </Button>
        }
      />
      <SheetContent side="bottom" className="max-h-[85dvh]">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 overflow-y-auto px-4 pb-8">
          {!isLoadingResources && (resources ?? []).length > 0 && (
            <FilterSection title="Recursos">
              <FilterChecklist
                items={toFilterItems(resources ?? [])}
                label="Recursos"
                selectedIds={resourceIds}
                onSelectedIdsChange={onResourceIdsChange}
              />
            </FilterSection>
          )}

          {!isLoadingServices && (services ?? []).length > 0 && (
            <FilterSection title="Servicios">
              <FilterChecklist
                items={toFilterItems(services ?? [])}
                label="Servicios"
                selectedIds={serviceIds}
                onSelectedIdsChange={onServiceIdsChange}
              />
            </FilterSection>
          )}

          <FilterSection title="Estado">
            <FilterChecklist
              items={STATUS_ITEMS}
              label="Estado"
              selectedIds={statuses}
              onSelectedIdsChange={onStatusesChange}
            />
          </FilterSection>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function FilterSection({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

function toFilterItems(items: NamedItem[]): FilterItem[] {
  return items.map((item) => ({ id: item.id, label: item.name }))
}
