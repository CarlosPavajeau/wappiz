import { useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  OverrideConflict,
  ScheduleOverrideKind,
} from "@wappiz/api-client/types/resources"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useState } from "react"
import type { DateRange } from "react-day-picker"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DateRangePicker } from "@/components/ui/date-picker"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { api } from "@/lib/client-api"
import { listResourceOverridesQuery } from "@/queries/resources"

type FormState = {
  kind: ScheduleOverrideKind
  range: DateRange | undefined
  partialDay: boolean
  startTime: string
  endTime: string
  reason: string
}

const DEFAULT_FORM: FormState = {
  endTime: "18:00",
  kind: "time_off",
  partialDay: false,
  range: undefined,
  reason: "",
  startTime: "09:00",
}

function toDateInput(date: Date) {
  return format(date, "yyyy-MM-dd")
}

type Props = {
  resourceId: string
}

export function CreateScheduleOverrideDialog({ resourceId }: Props) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [conflicts, setConflicts] = useState<OverrideConflict[]>([])

  const update = (changes: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...changes }))
  }

  const withTimes = form.kind === "custom_hours" || form.partialDay

  const queryClient = useQueryClient()
  const { mutate: createOverride, isPending } = useMutation({
    mutationFn: () => {
      const from = form.range?.from
      if (!from) {
        return Promise.reject(new Error("Selecciona una fecha"))
      }
      return api.resources.createOverride(resourceId, {
        endDate: toDateInput(form.range?.to ?? from),
        endTime: withTimes ? form.endTime : undefined,
        kind: form.kind,
        reason: form.reason,
        startDate: toDateInput(from),
        startTime: withTimes ? form.startTime : undefined,
      })
    },
    onError: () => {
      toast.error("Error al guardar la excepción. Intenta de nuevo.")
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries(
        listResourceOverridesQuery(resourceId)
      )

      if (response.conflicts.length > 0) {
        setConflicts(response.conflicts)
        return
      }

      setOpen(false)
      toast.success("Excepción creada correctamente")
    },
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setForm(DEFAULT_FORM)
      setConflicts([])
    }
    setOpen(next)
  }

  const timesValid = !withTimes || form.startTime < form.endTime
  const isValid =
    form.range?.from !== undefined &&
    form.reason.trim().length > 0 &&
    timesValid

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Agregar excepción
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar excepción de horario</DialogTitle>
          <DialogDescription>
            Bloquea un periodo (vacaciones, festivos) o define un horario
            distinto al habitual para fechas específicas.
          </DialogDescription>
        </DialogHeader>

        {conflicts.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm">
              La excepción se guardó, pero hay {conflicts.length}{" "}
              {conflicts.length === 1 ? "cita existente" : "citas existentes"}{" "}
              en ese periodo. Revísalas en la agenda para reprogramarlas o
              cancelarlas.
            </p>
            <ul className="divide-y rounded-md border text-sm">
              {conflicts.map((conflict) => (
                <li key={conflict.appointmentId} className="space-y-0.5 p-2.5">
                  <p className="font-medium capitalize">
                    {format(new Date(conflict.startsAt), "d MMM yyyy, h:mm a", {
                      locale: es,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {conflict.customerName} · {conflict.serviceName}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-4">
            <RadioGroup
              aria-label="Tipo de excepción"
              value={form.kind}
              onValueChange={(value) => {
                if (value === "time_off" || value === "custom_hours") {
                  update({ kind: value })
                }
              }}
              className="grid-cols-2"
            >
              <Label className="flex items-center gap-2 rounded-md border p-3 text-sm font-medium has-data-checked:border-primary">
                <RadioGroupItem value="time_off" />
                Tiempo libre
              </Label>
              <Label className="flex items-center gap-2 rounded-md border p-3 text-sm font-medium has-data-checked:border-primary">
                <RadioGroupItem value="custom_hours" />
                Horario especial
              </Label>
            </RadioGroup>

            <div className="space-y-1.5">
              <Label htmlFor="override-range">Fechas</Label>
              <DateRangePicker
                value={form.range}
                onChange={(range) => update({ range })}
                placeholder="Selecciona una o varias fechas"
              />
            </div>

            {form.kind === "time_off" && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="override-partial"
                  checked={form.partialDay}
                  onCheckedChange={(checked) =>
                    update({ partialDay: Boolean(checked) })
                  }
                />
                <label
                  htmlFor="override-partial"
                  className="cursor-pointer text-sm font-medium"
                >
                  Bloquear solo un horario de cada día
                </label>
              </div>
            )}

            {withTimes && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="override-start">
                    {form.kind === "time_off" ? "Desde" : "Apertura"}
                  </Label>
                  <Input
                    id="override-start"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => update({ startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="override-end">
                    {form.kind === "time_off" ? "Hasta" : "Cierre"}
                  </Label>
                  <Input
                    id="override-end"
                    type="time"
                    value={form.endTime}
                    onChange={(e) => update({ endTime: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="override-reason">Motivo</Label>
              <Input
                id="override-reason"
                placeholder="Ej. Vacaciones, día festivo, mantenimiento…"
                value={form.reason}
                onChange={(e) => update({ reason: e.target.value })}
              />
            </div>
          </div>
        )}

        <DialogFooter showCloseButton>
          {conflicts.length > 0 ? (
            <Button onClick={() => handleOpenChange(false)}>Entendido</Button>
          ) : (
            <Button
              onClick={() => createOverride()}
              disabled={isPending || !isValid}
            >
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
