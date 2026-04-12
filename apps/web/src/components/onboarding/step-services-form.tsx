import { arktypeResolver } from "@hookform/resolvers/arktype"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { ApiError } from "@wappiz/api-client"
import type { ServiceTemplate } from "@wappiz/api-client/types/onboarding"
import { type } from "arktype"
import { Info, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/client-api"

import { StepIndicator } from "./step-indicator"

const MAX_SERVICES = 10

const DURATION_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "20 min", value: 20 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "90 min", value: 90 },
]

const TEMPLATE_LABELS: Record<"basic" | "complete" | "manual", string> = {
  basic: "Básica",
  complete: "Completa",
  manual: "Manual",
}

const serviceItemSchema = type({
  bufferMinutes: "number >= 0",
  durationMinutes: "number > 0",
  name: "string >= 2",
  price: "number >= 0",
})

const servicesSchema = type({
  services: serviceItemSchema.array(),
})

type ServicesFormData = typeof servicesSchema.infer

type Screen = "template" | "edit"

const DEFAULT_SERVICE = {
  bufferMinutes: 0,
  durationMinutes: 30,
  name: "",
  price: 0,
}

const getNumberProperty = (source: object, key: string) => {
  const value = Reflect.get(source, key)
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

const normalizeTemplateService = (
  service: ServiceTemplate
): ServicesFormData["services"][number] => {
  const durationFromLegacyKey = getNumberProperty(service, "duration")
  const durationMinutes =
    service.durationMinutes > 0
      ? service.durationMinutes
      : (durationFromLegacyKey ?? 0) > 0
        ? (durationFromLegacyKey ?? 0)
        : DEFAULT_SERVICE.durationMinutes

  return {
    bufferMinutes:
      service.bufferMinutes >= 0
        ? service.bufferMinutes
        : DEFAULT_SERVICE.bufferMinutes,
    durationMinutes,
    name: service.name.trim(),
    price: service.price >= 0 ? service.price : DEFAULT_SERVICE.price,
  }
}

export function StepServicesForm() {
  const navigate = useNavigate()
  const [screen, setScreen] = useState<Screen>("template")

  const { data: templatesData, isPending: isLoadingTemplates } = useQuery({
    queryFn: () => api.onboarding.templates(),
    queryKey: ["onboarding", "templates"],
    staleTime: Number.POSITIVE_INFINITY,
  })

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ServicesFormData>({
    defaultValues: { services: [] },
    resolver: arktypeResolver(servicesSchema),
  })

  const { fields, append, remove, replace } = useFieldArray({
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
    onSuccess: () =>
      navigate({
        params: { step: "4" },
        to: "/onboarding/step/$step",
      }),
  })

  const handleTemplateSelect = (services: ServiceTemplate[]) => {
    const initial =
      services.length > 0
        ? services.map(normalizeTemplateService)
        : [DEFAULT_SERVICE]
    replace(initial)
    setScreen("edit")
  }

  const onSubmit = handleSubmit(async (data) => {
    await mutateAsync(data)
  })

  if (screen === "template") {
    return (
      <div className="flex flex-col gap-6">
        <StepIndicator currentStep={3} />

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Servicios</CardTitle>
            <CardDescription>
              Elige una plantilla para empezar rápido o configura los tuyos
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            {isLoadingTemplates ? (
              <>
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </>
            ) : (
              (["basic", "complete", "manual"] as const).map((key) => {
                const services = templatesData?.templates[key] ?? []
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTemplateSelect(services)}
                    className="group flex flex-col gap-1.5 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="text-sm font-semibold">
                      {TEMPLATE_LABELS[key]}
                    </span>
                    {services.length > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        {services.map((s) => s.name).join(" · ")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Agrega tus servicios manualmente
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator currentStep={3} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Tus servicios</CardTitle>
          <CardDescription>
            Ajusta los nombres, duración y precios
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
            <FieldGroup>
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2"
                >
                  <Field
                    data-invalid={!!errors.services?.[index]?.name}
                    className="col-span-4"
                  >
                    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
                      <Field className="gap-1">
                        <FieldLabel htmlFor={`service-name-${index}`}>
                          Servicio
                        </FieldLabel>
                        <Input
                          id={`service-name-${index}`}
                          type="text"
                          placeholder="Nombre del servicio"
                          aria-invalid={!!errors.services?.[index]?.name}
                          {...register(`services.${index}.name`)}
                        />
                      </Field>

                      <Controller
                        control={control}
                        name={`services.${index}.durationMinutes`}
                        render={({ field: dField }) => (
                          <Field
                            data-invalid={
                              !!errors.services?.[index]?.durationMinutes
                            }
                            className="w-28 gap-1"
                          >
                            <FieldLabel htmlFor={`service-duration-${index}`}>
                              Duración
                            </FieldLabel>
                            <Select
                              value={String(dField.value)}
                              onValueChange={(val) =>
                                dField.onChange(Number(val))
                              }
                            >
                              <SelectTrigger
                                id={`service-duration-${index}`}
                                className="w-28"
                              >
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

                      <Field
                        data-invalid={!!errors.services?.[index]?.price}
                        className="w-28 gap-1"
                      >
                        <FieldLabel htmlFor={`service-price-${index}`}>
                          Costo
                        </FieldLabel>
                        <Input
                          id={`service-price-${index}`}
                          type="number"
                          min="0"
                          step="100"
                          placeholder="Precio"
                          aria-invalid={!!errors.services?.[index]?.price}
                          {...register(`services.${index}.price`, {
                            valueAsNumber: true,
                          })}
                        />
                      </Field>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={fields.length <= 1}
                        onClick={() => remove(index)}
                        aria-label="Eliminar servicio"
                      >
                        <Trash2 />
                      </Button>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
                      <FieldError errors={[errors.services?.[index]?.name]} />
                      <FieldError
                        errors={[errors.services?.[index]?.durationMinutes]}
                      />
                      <FieldError errors={[errors.services?.[index]?.price]} />
                      <div />
                    </div>
                  </Field>
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
                <Plus />
                Agregar servicio
              </Button>
            </FieldGroup>

            <div className="flex items-start gap-2.5 rounded-lg bg-muted/60 px-3.5 py-3 text-sm text-muted-foreground">
              <Info className="mt-px size-4 shrink-0 text-primary/70" />
              <p>
                El buffer entre citas lo configuras después en cada servicio.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setScreen("template")}
                className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                ← Cambiar plantilla
              </button>
              <Button type="submit" className="ml-auto" disabled={isSubmitting}>
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
