import { useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  WorkingHour,
  WorkingHoursInterval,
} from "@wappiz/api-client/types/resources"
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
import { api } from "@/lib/client-api"
import { cn } from "@/lib/utils"
import { listResourcesQuery } from "@/queries/resources"

type DayState = {
  dayOfWeek: number
  dayName: string
  intervals: WorkingHoursInterval[]
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

const DEFAULT_INTERVAL: WorkingHoursInterval = {
  endTime: "18:00",
  startTime: "09:00",
}

type Props = {
  resourceId: string
  workingHours: WorkingHour[]
  defaultOpen?: boolean
}

function seedDays(workingHours: WorkingHour[]): DayState[] {
  return ALL_DAYS.map((day) => {
    const intervals = workingHours
      .filter((h) => h.dayOfWeek === day.dayOfWeek && h.isActive)
      .map((h) => ({
        endTime: toTimeInput(h.endTime),
        startTime: toTimeInput(h.startTime),
      }))
      .toSorted((a, b) => a.startTime.localeCompare(b.startTime))

    return { ...day, intervals }
  })
}

function findInvalidDay(days: DayState[]): DayState | undefined {
  return days.find((day) => {
    const sorted = day.intervals.toSorted((a, b) =>
      a.startTime.localeCompare(b.startTime)
    )
    return sorted.some(
      (iv, i) =>
        iv.startTime >= iv.endTime ||
        (i > 0 && iv.startTime < sorted[i - 1].endTime)
    )
  })
}

export function UpdateWorkingHoursDialog({
  resourceId,
  workingHours,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [days, setDays] = useState<DayState[]>(() =>
    defaultOpen ? seedDays(workingHours) : []
  )

  const updateDay = (dayOfWeek: number, changes: Partial<DayState>) => {
    setDays((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...changes } : d))
    )
  }

  const updateInterval = (
    day: DayState,
    index: number,
    changes: Partial<WorkingHoursInterval>
  ) => {
    updateDay(day.dayOfWeek, {
      intervals: day.intervals.map((iv, i) =>
        i === index ? { ...iv, ...changes } : iv
      ),
    })
  }

  const addInterval = (day: DayState) => {
    const last = day.intervals.at(-1)
    const next = last
      ? { endTime: "18:00", startTime: last.endTime }
      : DEFAULT_INTERVAL
    updateDay(day.dayOfWeek, { intervals: [...day.intervals, next] })
  }

  const removeInterval = (day: DayState, index: number) => {
    updateDay(day.dayOfWeek, {
      intervals: day.intervals.filter((_, i) => i !== index),
    })
  }

  const queryClient = useQueryClient()
  const { mutate: saveHours, isPending } = useMutation({
    mutationFn: () => {
      const invalid = findInvalidDay(days)
      if (invalid) {
        return Promise.reject(
          new Error(
            `Los intervalos de ${invalid.dayName.toLowerCase()} se superponen o están mal ordenados`
          )
        )
      }
      return api.resources.updateWorkingHours(resourceId, {
        days: days
          .filter((d) => d.intervals.length > 0)
          .map((d) => ({
            dayOfWeek: d.dayOfWeek,
            intervals: d.intervals.toSorted((a, b) =>
              a.startTime.localeCompare(b.startTime)
            ),
          })),
      })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message.startsWith("Los intervalos")
          ? error.message
          : "Error al actualizar el horario. Intenta de nuevo."
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(listResourcesQuery)

      setOpen(false)
      toast.success("Horario actualizado correctamente")
    },
  })

  const handleOpenChange = (next: boolean) => {
    setDays(next ? seedDays(workingHours) : [])
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        Editar
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar horario semanal</DialogTitle>
          <DialogDescription>
            Activa los días y define los horarios de atención. Agrega varios
            intervalos en un día para registrar descansos (p. ej. almuerzo).
          </DialogDescription>
        </DialogHeader>

        <ul aria-label="Horario semanal" className="space-y-3">
          {days.map((day) => {
            const isActive = day.intervals.length > 0

            return (
              <li key={day.dayOfWeek} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`active-${day.dayOfWeek}`}
                    checked={isActive}
                    onCheckedChange={(checked) =>
                      updateDay(day.dayOfWeek, {
                        intervals: checked ? [DEFAULT_INTERVAL] : [],
                      })
                    }
                  />
                  <label
                    htmlFor={`active-${day.dayOfWeek}`}
                    className="cursor-pointer text-sm font-medium capitalize"
                  >
                    {day.dayName.toLowerCase()}
                  </label>
                </div>

                <div
                  className={cn(
                    "ml-6 space-y-2 transition-opacity",
                    !isActive && "hidden"
                  )}
                >
                  {day.intervals.map((interval, index) => (
                    <div
                      key={`${day.dayOfWeek}-${index}`}
                      className="flex items-center gap-2"
                    >
                      <Input
                        aria-label={`Apertura ${day.dayName} intervalo ${index + 1}`}
                        type="time"
                        value={interval.startTime}
                        onChange={(e) =>
                          updateInterval(day, index, {
                            startTime: e.target.value,
                          })
                        }
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <Input
                        aria-label={`Cierre ${day.dayName} intervalo ${index + 1}`}
                        type="time"
                        value={interval.endTime}
                        onChange={(e) =>
                          updateInterval(day, index, {
                            endTime: e.target.value,
                          })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Quitar intervalo ${index + 1} de ${day.dayName}`}
                        onClick={() => removeInterval(day, index)}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addInterval(day)}
                  >
                    Agregar intervalo
                  </Button>
                </div>
              </li>
            )
          })}
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
