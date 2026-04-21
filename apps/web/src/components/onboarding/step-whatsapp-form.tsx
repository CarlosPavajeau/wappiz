import { arktypeResolver } from "@hookform/resolvers/arktype"
import { Clock01Icon, SmartPhone01Icon } from "@hugeicons/core-free-icons"
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
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/client-api"
import { onboardingProgressQuery } from "@/queries/onboarding"

const whatsappSchema = type({
  contactEmail: "string.email",
  "notes?": "string",
})

type WhatsAppFormData = typeof whatsappSchema.infer

export function StepWhatsAppForm({ initialEmail }: { initialEmail: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<WhatsAppFormData>({
    defaultValues: {
      contactEmail: initialEmail,
      notes: "",
    },
    resolver: arktypeResolver(whatsappSchema),
  })

  const { mutateAsync } = useMutation({
    mutationFn: (data: WhatsAppFormData) =>
      api.onboarding.completeStep4({
        contactEmail: data.contactEmail,
        ...(data.notes ? { notes: data.notes } : {}),
      }),
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
        to: "/dashboard",
      })
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    await mutateAsync(data)
  })

  return (
    <div className="flex w-full max-w-lg animate-in flex-col gap-8 duration-[280ms] ease-out fade-in-0 slide-in-from-bottom-3">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium tracking-[0.18em] text-muted-foreground/60 uppercase">
          Paso 4 de 4
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          Activación de WhatsApp
        </h1>
        <p className="text-sm text-muted-foreground">
          Asignamos un número exclusivo de WhatsApp para tu negocio.
        </p>
      </div>

      <div className="rounded-lg bg-muted/50 p-4">
        <div className="flex items-start gap-3">
          <HugeiconsIcon
            icon={SmartPhone01Icon}
            strokeWidth={2}
            className="mt-0.5 size-4 shrink-0 text-primary"
          />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              Número exclusivo para tu negocio
            </span>
            <p className="text-xs leading-relaxed text-muted-foreground">
              El equipo de wappiz te asignará un número de WhatsApp dedicado
              para gestionar las reservas. Nos comunicaremos por el correo que
              indiques. Si ya tienes un número de WhatsApp, puedes indicarlo en
              las notas.
            </p>
          </div>
        </div>
      </div>

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <FieldGroup>
          <Controller
            control={control}
            name="contactEmail"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Correo de contacto</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="email"
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  Notas adicionales{" "}
                  <span className="font-normal text-muted-foreground">
                    (opcional)
                  </span>
                </FieldLabel>
                <Textarea
                  {...field}
                  id={field.name}
                  placeholder="Ej. Prefiero que me contacten en la mañana…"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </FieldGroup>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
          <HugeiconsIcon
            icon={Clock01Icon}
            className="size-3.5 shrink-0"
            strokeWidth={2}
          />
          Tiempo de activación:{" "}
          <span className="font-medium text-foreground">2 horas hábiles</span>
        </p>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting && <Spinner />}
            Finalizar y explorar el panel
          </Button>
        </div>
      </form>
    </div>
  )
}
