import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

import { STATUS_ITEMS } from "./calendar-config"

type FilterItem = {
  id: string
  name: string
}

type Props = {
  resources: FilterItem[] | undefined
  services: FilterItem[] | undefined
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
            <section className="flex flex-col gap-3">
              <h3 className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                Recursos
              </h3>
              <ul className="flex flex-col gap-3">
                {(resources ?? []).map((r) => (
                  <li key={r.id} className="flex items-center gap-2.5">
                    <Checkbox
                      id={`mobile-resource-${r.id}`}
                      checked={resourceIds.includes(r.id)}
                      onCheckedChange={(checked) => {
                        onResourceIdsChange(
                          checked
                            ? [...resourceIds, r.id]
                            : resourceIds.filter((id) => id !== r.id)
                        )
                      }}
                    />
                    <label
                      htmlFor={`mobile-resource-${r.id}`}
                      className="cursor-pointer text-sm"
                    >
                      {r.name}
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!isLoadingServices && (services ?? []).length > 0 && (
            <section className="flex flex-col gap-3">
              <h3 className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                Servicios
              </h3>
              <ul className="flex flex-col gap-3">
                {(services ?? []).map((s) => (
                  <li key={s.id} className="flex items-center gap-2.5">
                    <Checkbox
                      id={`mobile-service-${s.id}`}
                      checked={serviceIds.includes(s.id)}
                      onCheckedChange={(checked) => {
                        onServiceIdsChange(
                          checked
                            ? [...serviceIds, s.id]
                            : serviceIds.filter((id) => id !== s.id)
                        )
                      }}
                    />
                    <label
                      htmlFor={`mobile-service-${s.id}`}
                      className="cursor-pointer text-sm"
                    >
                      {s.name}
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h3 className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
              Estado
            </h3>
            <ul className="flex flex-col gap-3">
              {STATUS_ITEMS.map((item) => (
                <li key={item.id} className="flex items-center gap-2.5">
                  <Checkbox
                    id={`mobile-status-${item.id}`}
                    checked={statuses.includes(item.id)}
                    onCheckedChange={(checked) => {
                      onStatusesChange(
                        checked
                          ? [...statuses, item.id]
                          : statuses.filter((id) => id !== item.id)
                      )
                    }}
                  />
                  {item.color && (
                    <div
                      className={cn("size-2 shrink-0 rounded-full", item.color)}
                    />
                  )}
                  <label
                    htmlFor={`mobile-status-${item.id}`}
                    className="cursor-pointer text-sm"
                  >
                    {item.label}
                  </label>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
