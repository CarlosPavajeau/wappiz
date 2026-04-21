import { arktypeResolver } from "@hookform/resolvers/arktype"
import { InformationCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
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
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/client-api"
import { onboardingProgressQuery } from "@/queries/onboarding"

const tenantSchema = type({
  name: type("string >= 2").configure({
    message: "El nombre debe tener al menos 2 caracteres",
  }),
})

type TenantFormData = typeof tenantSchema.infer

export function StepTenantForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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
    onSuccess: async () => {
      await queryClient.invalidateQueries(onboardingProgressQuery)
      navigate({ params: { step: "2" }, to: "/onboarding/step/$step" })
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    await mutateAsync(data)
  })

  return (
    <div className="flex w-full max-w-lg animate-in flex-col gap-8 duration-[280ms] ease-out fade-in-0 slide-in-from-bottom-3">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium tracking-[0.18em] text-muted-foreground/60 uppercase">
          Paso 1 de 4
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          Información de tu negocio
        </h1>
        <p className="text-sm text-muted-foreground">
          Cuéntanos un poco sobre tu negocio para comenzar.
        </p>
      </div>

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <FieldGroup>
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nombre del negocio</FieldLabel>
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

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground/70">
          <HugeiconsIcon
            icon={InformationCircleIcon}
            className="mt-px size-3.5 shrink-0"
            strokeWidth={2}
          />
          Este nombre será visible para tus clientes al momento de agendar una
          cita.
        </p>

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
