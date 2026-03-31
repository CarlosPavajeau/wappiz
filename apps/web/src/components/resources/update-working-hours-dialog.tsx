import { useMutation } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import type { WorkingHour } from "@wappiz/api-client/types/resources"
import { useState } from "react"
import { toast } from "sonner"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/client-api"
import { cn } from "@/lib/utils"

type HourState = {
  id: string
  dayOfWeek: number
  dayName: string
  startTime: string
  endTime: string
  isActive: boolean
}

function toTimeInput(time: string) {
  return time.slice(0, 5)
}

const ALL_DAYS = [
  { dayName: "Domingo", dayOfWeek: 0 },
  { dayName: "Lunes", dayOfWeek: 1 },
  { dayName: "Martes", dayOfWeek: 2 },
  { dayName: "Miércoles", dayOfWeek: 3 },
  { dayName: "Jueves", dayOfWeek: 4 },
  { dayName: "Viernes", dayOfWeek: 5 },
  { dayName: "Sábado", dayOfWeek: 6 },
]

type Props = {
  resourceId: string
  workingHours: WorkingHour[]
  defaultOpen?: boolean
}

function seedHours(workingHours: WorkingHour[]): HourState[] {
  const byDay = new Map(workingHours.map((h) => [h.dayOfWeek, h]))

  return ALL_DAYS.map((day) => {
    const existing = byDay.get(day.dayOfWeek)
    if (existing) {
      return {
        ...existing,
        endTime: toTimeInput(existing.endTime),
        startTime: toTimeInput(existing.startTime),
      }
    }
    return {
      dayName: day.dayName,
      dayOfWeek: day.dayOfWeek,
      endTime: "18:00",
      id: `day-${day.dayOfWeek}`,
      isActive: false,
      startTime: "09:00",
    }
  })
}

export function UpdateWorkingHoursDialog({
  resourceId,
  workingHours,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [hours, setHours] = useState<HourState[]>(() =>
    defaultOpen ? seedHours(workingHours) : []
  )
  const router = useRouter()

  const updateHour = (index: number, changes: Partial<HourState>) => {
    setHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, ...changes } : h))
    )
  }

  const { mutate: saveHours, isPending } = useMutation({
    mutationFn: () =>
      Promise.all(
        hours.map((h) =>
          api.resources.updateWorkingHours(resourceId, {
            dayOfWeek: h.dayOfWeek,
            endTime: h.endTime,
            isActive: h.isActive,
            startTime: h.startTime,
          })
        )
      ),
    onError: () => {
      toast.error("Error al actualizar el horario. Intenta de nuevo.")
    },
    onSuccess: () => {
      setOpen(false)
      toast.success("Horario actualizado correctamente")
      router.invalidate()
    },
  })

  const handleOpenChange = (next: boolean) => {
    setHours(next ? seedHours(workingHours) : [])
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        Editar
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar horario semanal</DialogTitle>
          <DialogDescription>
            Activa los días y define el horario de atención para cada uno.
          </DialogDescription>
        </DialogHeader>

        <ul aria-label="Horario semanal" className="space-y-3">
          {hours.map((hour, index) => (
            <li key={hour.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`active-${hour.id}`}
                  checked={hour.isActive}
                  onCheckedChange={(checked) =>
                    updateHour(index, { isActive: Boolean(checked) })
                  }
                />
                <label
                  htmlFor={`active-${hour.id}`}
                  className="cursor-pointer text-sm font-medium capitalize"
                >
                  {hour.dayName.toLowerCase()}
                </label>
              </div>

              <div
                className={cn(
                  "ml-6 grid grid-cols-2 gap-2 transition-opacity",
                  !hour.isActive && "pointer-events-none opacity-40"
                )}
              >
                <div className="space-y-1">
                  <Label
                    htmlFor={`start-${hour.id}`}
                    className="text-muted-foreground text-xs"
                  >
                    Apertura
                  </Label>
                  <Input
                    id={`start-${hour.id}`}
                    type="time"
                    value={hour.startTime}
                    disabled={!hour.isActive}
                    onChange={(e) =>
                      updateHour(index, { startTime: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor={`end-${hour.id}`}
                    className="text-muted-foreground text-xs"
                  >
                    Cierre
                  </Label>
                  <Input
                    id={`end-${hour.id}`}
                    type="time"
                    value={hour.endTime}
                    disabled={!hour.isActive}
                    onChange={(e) =>
                      updateHour(index, { endTime: e.target.value })
                    }
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>

        <DialogFooter showCloseButton>
          <Button onClick={() => saveHours()} disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
