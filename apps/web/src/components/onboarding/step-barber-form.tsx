import { arktypeResolver } from "@hookform/resolvers/arktype"
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { type } from "arktype"
import { ApiError } from "@wappiz/api-client"
import { ChevronLeft, Info, Loader2 } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/client-api"

import { StepIndicator } from "./step-indicator"

const TIME_OPTIONS = Array.from({ length: 35 }, (_, i) => {
  const totalMinutes = 6 * 60 + i * 30
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
  const period = hours >= 12 ? "PM" : "AM"
  const displayHour = hours % 12 || 12
  const label = `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`
  return { label, value }
})

const DAYS = [
  { label: "Dom", value: 0 },
  { label: "Lun", value: 1 },
  { label: "Mar", value: 2 },
  { label: "Mié", value: 3 },
  { label: "Jue", value: 4 },
  { label: "Vie", value: 5 },
  { label: "Sáb", value: 6 },
]

const barberSchema = type({
  endTime: "string",
  name: "string >= 2",
  startTime: "string",
  workingDays: "number[]",
})

type BarberFormData = typeof barberSchema.infer

export function StepBarberForm() {
  const navigate = useNavigate()

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<BarberFormData>({
    defaultValues: {
      endTime: "19:00",
      name: "",
      startTime: "09:00",
      workingDays: [1, 2, 3, 4, 5, 6],
    },
    resolver: arktypeResolver(barberSchema),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: BarberFormData) => api.onboarding.completeStep2(data),
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Algo salió mal. Intenta de nuevo."
      )
    },
    onSuccess: () =>
      navigate({
        params: { step: "3" },
        to: "/onboarding/step/$step",
      }),
  })

  const onSubmit = handleSubmit((data) => {
    if (data.workingDays.length === 0) {
      setError("workingDays", { message: "Selecciona al menos un día." })
      return
    }
    if (data.endTime <= data.startTime) {
      setError("endTime", {
        message: "La hora de cierre debe ser después de la apertura.",
      })
      return
    }
    mutate(data)
  })

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator currentStep={2} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Tu primer barbero</CardTitle>
          <CardDescription>
            Agrega el primer miembro de tu equipo
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">Nombre</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ej. Carlos"
                  autoComplete="off"
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
                <FieldError errors={[errors.name]} />
              </Field>

              <Controller
                control={control}
                name="workingDays"
                render={({ field }) => (
                  <Field data-invalid={!!errors.workingDays}>
                    <FieldTitle>Días de trabajo</FieldTitle>
                    <div className="grid grid-cols-7 gap-1">
                      {DAYS.map((day) => (
                        <label
                          key={day.value}
                          className="flex cursor-pointer flex-col items-center gap-1.5 rounded-md p-2 transition-colors hover:bg-muted"
                        >
                          <Checkbox
                            checked={field.value.includes(day.value)}
                            onCheckedChange={(checked) => {
                              const next = checked
                                ? [...field.value, day.value].toSorted(
                                    (a, b) => a - b
                                  )
                                : field.value.filter((d) => d !== day.value)
                              field.onChange(next)
                            }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {day.label}
                          </span>
                        </label>
                      ))}
                    </div>
                    <FieldError
                      errors={[
                        errors.workingDays as { message?: string } | undefined,
                      ]}
                    />
                  </Field>
                )}
              />

              <Field>
                <FieldTitle>Horario de atención</FieldTitle>
                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    control={control}
                    name="startTime"
                    render={({ field }) => (
                      <Field data-invalid={!!errors.startTime}>
                        <FieldLabel htmlFor="startTime">Apertura</FieldLabel>
                        <Select
                          value={field.value}
                          onValueChange={(val) => field.onChange(val)}
                        >
                          <SelectTrigger
                            id="startTime"
                            className="w-full"
                            aria-invalid={!!errors.startTime}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError errors={[errors.startTime]} />
                      </Field>
                    )}
                  />

                  <Controller
                    control={control}
                    name="endTime"
                    render={({ field }) => (
                      <Field data-invalid={!!errors.endTime}>
                        <FieldLabel htmlFor="endTime">Cierre</FieldLabel>
                        <Select
                          value={field.value}
                          onValueChange={(val) => field.onChange(val)}
                        >
                          <SelectTrigger
                            id="endTime"
                            className="w-full"
                            aria-invalid={!!errors.endTime}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError errors={[errors.endTime]} />
                      </Field>
                    )}
                  />
                </div>
              </Field>
            </FieldGroup>

            <div className="flex items-start gap-2.5 rounded-lg bg-muted/60 px-3.5 py-3 text-sm text-muted-foreground">
              <Info className="mt-px size-4 shrink-0 text-primary/70" />
              <p>
                Podrás agregar más barberos y personalizar horarios individuales
                desde el panel.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() =>
                  navigate({
                    params: { step: "1" },
                    to: "/onboarding/step/$step",
                  })
                }
                className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
                Atrás
              </button>
              <Button type="submit" className="ml-auto" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                Continuar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
