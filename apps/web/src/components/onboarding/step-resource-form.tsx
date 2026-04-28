import { arktypeResolver } from "@hookform/resolvers/arktype"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { ApiError } from "@wappiz/api-client"
import { type } from "arktype"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"
import { onboardingProgressQuery } from "@/queries/onboarding"

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

const resourceSchema = type({
  name: type("string >= 2").configure({
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  type: type("string >= 1").configure({
    message: "El tipo es requerido",
  }),
  startTime: type("string").configure({
    message: "Selecciona una hora de apertura.",
  }),
  endTime: type("string").configure({
    message: "Selecciona una hora de cierre.",
  }),
  workingDays: type("number[] > 0").configure({
    message: "Selecciona al menos un día de trabajo.",
  }),
}).narrow((data, ctx) => {
  const { startTime, endTime } = data
  if (endTime <= startTime) {
    return ctx.reject({
      expected: "La hora de cierre debe ser después de la apertura",
      actual: endTime,
      path: ["endTime"],
    })
  }

  return true
})

type ResourceFormData = typeof resourceSchema.infer

export function StepResourceForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ResourceFormData>({
    defaultValues: {
      endTime: "19:00",
      name: "",
      startTime: "09:00",
      workingDays: [1, 2, 3, 4, 5, 6],
    },
    resolver: arktypeResolver(resourceSchema),
  })

  const { mutateAsync } = useMutation({
    mutationFn: (data: ResourceFormData) => api.onboarding.completeStep2(data),
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Algo salió mal. Intenta de nuevo."
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(onboardingProgressQuery)
      navigate({
        params: { step: "3" },
        to: "/onboarding/step/$step",
      })
    },
  })

  const onSubmit = handleSubmit(async (data) => await mutateAsync(data))

  return (
    <div className="flex w-full max-w-lg animate-in flex-col gap-8 duration-280 ease-out fade-in-0 slide-in-from-bottom-3">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium tracking-[0.18em] text-muted-foreground/60 uppercase">
          Paso 2 de 4
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          Tu primer recurso
        </h1>
        <p className="text-sm text-muted-foreground">
          Agrega el primer miembro de tu equipo y su horario.
        </p>
      </div>

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
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
                  autoFocus
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={control}
            name="type"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Tipo</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="Empleado, Sala, Equipo…"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={control}
            name="workingDays"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldTitle>Días de trabajo</FieldTitle>
                <div
                  className="grid grid-cols-7 gap-1.5"
                  role="group"
                  aria-label="Días de trabajo"
                >
                  {DAYS.map((day) => {
                    const isSelected = field.value.includes(day.value)
                    return (
                      <button
                        key={day.value}
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        onClick={() => {
                          const next = isSelected
                            ? field.value
                                .filter((d) => d !== day.value)
                                .toSorted(sortByDay)
                            : [...field.value, day.value].toSorted(sortByDay)
                          field.onChange(next)
                        }}
                        className={cn(
                          "flex h-10 items-center justify-center rounded-md text-xs font-medium transition-all",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {day.label}
                      </button>
                    )
                  })}
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id={field.name}
                        className="w-full"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue>
                          {TIME_LABELS_BY_VALUE.get(field.value) ?? field.value}
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id={field.name}
                        className="w-full"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue>
                          {TIME_LABELS_BY_VALUE.get(field.value) ?? field.value}
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

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting && <Spinner />}
            Continuar
          </Button>
        </div>
      </form>
    </div>
  )
}
