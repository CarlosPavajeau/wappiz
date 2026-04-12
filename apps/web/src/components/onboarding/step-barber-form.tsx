import { arktypeResolver } from "@hookform/resolvers/arktype"
import { InformationCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { ApiError } from "@wappiz/api-client"
import { type } from "arktype"
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
import { Spinner } from "@/components/ui/spinner"
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

const TIME_LABELS_BY_VALUE = new Map(
  TIME_OPTIONS.map(({ label, value }) => [value, label])
)
const sortByDay = (left: number, right: number) => left - right

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
  endTime: type("string").configure({
    message: "Selecciona una hora de cierre.",
  }),
  name: type("string >= 2").configure({
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  startTime: type("string").configure({
    message: "Selecciona una hora de apertura.",
  }),
  workingDays: type("number[]").configure({
    message: "Selecciona al menos un día de trabajo.",
  }),
})

type BarberFormData = typeof barberSchema.infer

export function StepBarberForm() {
  const navigate = useNavigate()

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BarberFormData>({
    defaultValues: {
      endTime: "19:00",
      name: "",
      startTime: "09:00",
      workingDays: [1, 2, 3, 4, 5, 6],
    },
    resolver: arktypeResolver(barberSchema),
  })

  const { mutateAsync } = useMutation({
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

  const onSubmit = handleSubmit(async (data) => {
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

    await mutateAsync(data)
  })

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator currentStep={2} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Tu primer recurso</CardTitle>
          <CardDescription>
            Agrega el primer miembro de tu equipo
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
            <FieldGroup>
              <Controller
                control={control}
                name="name"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Nombre</FieldLabel>
                    <Input
                      id={field.name}
                      type="text"
                      placeholder="Ej. Carlos"
                      autoComplete="off"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    <FieldError errors={[errors.name]} />
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="workingDays"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
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
                                ? [...field.value, day.value].sort(sortByDay)
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
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Field>
                <FieldTitle>Horario de atención</FieldTitle>
                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    control={control}
                    name="startTime"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>Apertura</FieldLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            id={field.name}
                            className="w-full"
                            aria-invalid={fieldState.invalid}
                          >
                            <SelectValue>
                              {TIME_LABELS_BY_VALUE.get(field.value) ??
                                field.value}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <Controller
                    control={control}
                    name="endTime"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>Cierre</FieldLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            id={field.name}
                            className="w-full"
                            aria-invalid={fieldState.invalid}
                          >
                            <SelectValue>
                              {TIME_LABELS_BY_VALUE.get(field.value) ??
                                field.value}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                </div>
              </Field>
            </FieldGroup>

            <div className="flex items-start gap-2.5 rounded-lg bg-muted/60 px-3.5 py-3 text-sm text-muted-foreground">
              <HugeiconsIcon
                icon={InformationCircleIcon}
                className="mt-px size-4 shrink-0 text-primary/70"
                strokeWidth={2}
              />
              <p>
                Podrás agregar más recursos y personalizar horarios individuales
                desde el panel.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button
                type="submit"
                className="ml-auto"
                disabled={isSubmitting}
                size="lg"
              >
                {isSubmitting && <Spinner />}
                Continuar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
