"use client"

import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
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

type FormState = {
  date: Date | undefined
  isDayOff: boolean
  startTime: string
  endTime: string
  reason: string
}

const DEFAULT_FORM: FormState = {
  date: undefined,
  endTime: "18:00",
  isDayOff: true,
  reason: "",
  startTime: "09:00",
}

type Props = {
  resourceId: string
}

export function CreateScheduleOverrideDialog({ resourceId }: Props) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const router = useRouter()

  const update = (changes: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...changes }))
  }

  const { mutate: createOverride, isPending } = useMutation({
    mutationFn: () => {
      if (!form.date) {
        throw new Error("Selecciona una fecha")
      }
      return api.resources.createOverride(resourceId, {
        date: form.date.toISOString().slice(0, 10),
        endTime: form.isDayOff ? undefined : form.endTime,
        isDayOff: form.isDayOff,
        reason: form.reason,
        startTime: form.isDayOff ? undefined : form.startTime,
      })
    },
    onError: () => {
      toast.error("Error al guardar la excepción. Intenta de nuevo.")
    },
    onSuccess: () => {
      setOpen(false)
      toast.success("Excepción creada correctamente")
      router.refresh()
    },
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setForm(DEFAULT_FORM)
    }
    setOpen(next)
  }

  const isValid = form.date !== undefined && form.reason.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Agregar excepción
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar excepción de horario</DialogTitle>
          <DialogDescription>
            Define una fecha específica como día libre o con horario distinto al
            habitual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="override-date">Fecha</Label>
            <DatePicker
              value={form.date}
              onChange={(date) => update({ date })}
              placeholder="Selecciona una fecha"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="override-day-off"
              checked={form.isDayOff}
              onCheckedChange={(checked) =>
                update({ isDayOff: Boolean(checked) })
              }
            />
            <label
              htmlFor="override-day-off"
              className="cursor-pointer text-sm font-medium"
            >
              Día no laborable
            </label>
          </div>

          {!form.isDayOff && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="override-start">Apertura</Label>
                <Input
                  id="override-start"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => update({ startTime: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="override-end">Cierre</Label>
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
              placeholder="Ej. Día festivo, mantenimiento…"
              value={form.reason}
              onChange={(e) => update({ reason: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter showCloseButton>
          <Button
            onClick={() => createOverride()}
            disabled={isPending || !isValid}
          >
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
