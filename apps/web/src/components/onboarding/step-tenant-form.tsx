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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/client-api"

import { StepIndicator } from "./step-indicator"

const tenantSchema = type({
  name: type("string >= 2").configure({
    message: "El nombre debe tener al menos 2 caracteres",
  }),
})

type TenantFormData = typeof tenantSchema.infer

export function StepTenantForm() {
  const navigate = useNavigate()

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<TenantFormData>({
    defaultValues: { name: "" },
    resolver: arktypeResolver(tenantSchema),
  })

  const { mutateAsync } = useMutation({
    mutationFn: (data: TenantFormData) => api.tenants.create(data),
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : "Error al crear el negocio"
      )
    },
    onSuccess: () => {
      navigate({ params: { step: "2" }, to: "/onboarding/step/$step" })
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    await mutateAsync(data)
  })

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator currentStep={1} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Información de tu negocio</CardTitle>
          <CardDescription>
            Cuéntanos un poco sobre tu negocio para comenzar
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
                    <FieldLabel htmlFor={field.name}>
                      Nombre del negocio
                    </FieldLabel>

                    <Input
                      id={field.name}
                      type="text"
                      placeholder="Ej. Barbería Don Carlos"
                      autoComplete="off"
                      autoFocus
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />

                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </FieldGroup>

            <div className="flex items-start gap-2.5 rounded-lg bg-muted/60 px-3.5 py-3 text-sm text-muted-foreground">
              <HugeiconsIcon
                icon={InformationCircleIcon}
                className="mt-px size-4 shrink-0 text-primary/70"
                strokeWidth={2}
              />
              <p>
                Este nombre será visible para tus clientes al momento de agendar
                una cita.
              </p>
            </div>

            <div className="flex items-center pt-1">
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
