import { useMutation } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import type { Service } from "@wappiz/api-client/types/services"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { api } from "@/lib/client-api"

const priceFormatter = new Intl.NumberFormat("es-MX", {
  currency: "MXN",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
})

type Props = {
  resourceId: string
  allServices: Service[]
  linkedServiceIds: string[]
}

export function LinkServicesDialog({
  resourceId,
  allServices,
  linkedServiceIds,
}: Props) {
  const [open, setOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const router = useRouter()

  const toggleService = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const { mutate: assignServices, isPending } = useMutation({
    mutationFn: () =>
      api.resources.assignService(resourceId, {
        serviceIds: [...selectedIds],
      }),
    onError: () => {
      toast.error("Error al guardar los servicios. Intenta de nuevo.")
    },
    onSuccess: () => {
      setOpen(false)
      toast.success("Servicios actualizados correctamente")
      router.invalidate()
    },
  })

  const handleOpenChange = (next: boolean) => {
    setSelectedIds(next ? new Set(linkedServiceIds) : new Set())
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Gestionar servicios
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gestionar servicios</DialogTitle>
          <DialogDescription>
            Selecciona los servicios que deseas asignar a este recurso.
          </DialogDescription>
        </DialogHeader>

        {allServices.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No hay servicios disponibles.
          </p>
        ) : (
          <ul
            aria-label="Servicios"
            className="max-h-80 divide-y overflow-y-auto"
          >
            {allServices.map((service) => {
              const checked = selectedIds.has(service.id)
              return (
                <li key={service.id}>
                  <label className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 px-1 py-3 transition-colors">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleService(service.id)}
                      aria-label={service.name}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">
                        {service.name}
                      </p>
                      {service.description && (
                        <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                          {service.description}
                        </p>
                      )}
                      <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                        {service.totalMinutes} min
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {priceFormatter.format(service.price)}
                    </Badge>
                  </label>
                </li>
              )
            })}
          </ul>
        )}

        <DialogFooter showCloseButton>
          <Button
            onClick={() => assignServices()}
            disabled={isPending || allServices.length === 0}
          >
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
