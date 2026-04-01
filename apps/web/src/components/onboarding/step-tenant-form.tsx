import { arktypeResolver } from "@hookform/resolvers/arktype"
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { type } from "arktype"
import { ApiError } from "@wappiz/api-client"
import { Info, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
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
import { api } from "@/lib/client-api"

import { StepIndicator } from "./step-indicator"

const tenantSchema = type({
  name: "string >= 2",
})

type TenantFormData = typeof tenantSchema.infer

export function StepTenantForm() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TenantFormData>({
    defaultValues: { name: "" },
    resolver: arktypeResolver(tenantSchema),
  })

  const { mutate } = useMutation({
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

  const onSubmit = handleSubmit((data) => {
    mutate(data)
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
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">Nombre del negocio</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ej. Barbería Don Carlos"
                  autoComplete="organization"
                  autoFocus
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
                <FieldError errors={[errors.name]} />
              </Field>
            </FieldGroup>

            <div className="flex items-start gap-2.5 rounded-lg bg-muted/60 px-3.5 py-3 text-sm text-muted-foreground">
              <Info className="mt-px size-4 shrink-0 text-primary/70" />
              <p>
                Este nombre será visible para tus clientes al momento de agendar
                una cita.
              </p>
            </div>

            <div className="flex items-center pt-1">
              <Button type="submit" className="ml-auto" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                Continuar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
