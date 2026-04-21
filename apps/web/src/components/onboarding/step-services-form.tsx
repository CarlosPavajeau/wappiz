import { arktypeResolver } from "@hookform/resolvers/arktype"
import {
  InformationCircleIcon,
  PlusSignIcon,
  Trash,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { ApiError } from "@wappiz/api-client"
import { type } from "arktype"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { api } from "@/lib/client-api"
import { onboardingProgressQuery } from "@/queries/onboarding"

import { StepIndicator } from "./step-indicator"

const MAX_SERVICES = 5

const DURATION_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "20 min", value: 20 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "90 min", value: 90 },
]

const serviceItemSchema = type({
  bufferMinutes: type("number>=0").configure({
    message: "El buffer debe ser mayor o igual a 0.",
  }),
  durationMinutes: type("number>0").configure({
    message: "La duración debe ser mayor a 0.",
  }),
  name: type("string>=2").configure({
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  price: type("number>=0").configure({
    message: "El precio debe ser mayor o igual a 0.",
  }),
})

const servicesSchema = type({
  services: serviceItemSchema.array(),
})

type ServicesFormData = typeof servicesSchema.infer

const DEFAULT_SERVICE = {
  bufferMinutes: 0,
  durationMinutes: 30,
  name: "",
  price: 0,
}

export function StepServicesForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ServicesFormData>({
    defaultValues: {
      services: [DEFAULT_SERVICE],
    },
    resolver: arktypeResolver(servicesSchema),
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "services",
  })

  const { mutateAsync } = useMutation({
    mutationFn: (data: ServicesFormData) => api.onboarding.completeStep3(data),
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
        params: { step: "4" },
        to: "/onboarding/step/$step",
      })
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    await mutateAsync(data)
  })

  return (
    <div className="flex w-full max-w-prose flex-col gap-6">
      <StepIndicator currentStep={3} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Tus servicios</CardTitle>
          <CardDescription>
            Ajusta los nombres, duración y precios
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <FieldGroup>
              {fields.map((f, index) => (
                <div
                  className="flex flex-col gap-2 md:flex-row md:items-end"
                  key={`${f.id}-${index}`}
                >
                  <Controller
                    control={control}
                    name={`services.${index}.name`}
                    render={({ field, fieldState }) => (
                      <Field className="flex-1">
                        <FieldLabel htmlFor={field.name}>Servicio</FieldLabel>
                        <Input
                          {...field}
                          id={field.name}
                          type="text"
                          placeholder="Nombre del servicio"
                          aria-invalid={fieldState.invalid}
                        />
                      </Field>
                    )}
                  />

                  <div className="flex gap-2">
                    <Controller
                      control={control}
                      name={`services.${index}.durationMinutes`}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>Duración</FieldLabel>
                          <Select
                            value={String(field.value)}
                            onValueChange={(val) => field.onChange(Number(val))}
                          >
                            <SelectTrigger id={field.name} className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DURATION_OPTIONS.map((opt) => (
                                <SelectItem
                                  key={opt.value}
                                  value={String(opt.value)}
                                >
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      )}
                    />

                    <Controller
                      control={control}
                      name={`services.${index}.price`}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>Precio</FieldLabel>
                          <Input
                            {...field}
                            id={field.name}
                            type="number"
                            min="0"
                            step="100"
                            aria-invalid={fieldState.invalid}
                            onChange={(e) => {
                              const val = e.target.value
                              field.onChange(val === "" ? "" : Number(val))
                            }}
                          />
                        </Field>
                      )}
                    />
                  </div>

                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="self-end text-muted-foreground hover:text-destructive"
                          disabled={fields.length <= 1}
                          onClick={() => remove(index)}
                          aria-label="Eliminar servicio"
                        >
                          <HugeiconsIcon icon={Trash} strokeWidth={2} />
                        </Button>
                      }
                    />
                    <TooltipContent>Descartar servicio</TooltipContent>
                  </Tooltip>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                disabled={fields.length >= MAX_SERVICES}
                onClick={() =>
                  append({
                    ...DEFAULT_SERVICE,
                  })
                }
              >
                <HugeiconsIcon
                  icon={PlusSignIcon}
                  strokeWidth={2}
                  data-icon="inline-start"
                />
                Agregar servicio
              </Button>
            </FieldGroup>

            <div className="flex items-start gap-2.5 rounded-lg bg-muted/60 px-3.5 py-3 text-sm text-muted-foreground">
              <HugeiconsIcon
                icon={InformationCircleIcon}
                className="mt-px size-4 shrink-0 text-primary/70"
                strokeWidth={2}
              />
              <p>
                Puedes agregar hasta {MAX_SERVICES} servicios. Si necesitas más,
                puedes agregar más servicios en el panel.
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
