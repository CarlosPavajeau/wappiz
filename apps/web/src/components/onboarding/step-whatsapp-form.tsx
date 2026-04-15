import { arktypeResolver } from "@hookform/resolvers/arktype"
import { Clock01Icon, SmartPhone01Icon } from "@hugeicons/core-free-icons"
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
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/client-api"

import { StepIndicator } from "./step-indicator"

const whatsappSchema = type({
  contactEmail: "string.email",
  "notes?": "string",
})

type WhatsAppFormData = typeof whatsappSchema.infer

export function StepWhatsAppForm({ initialEmail }: { initialEmail: string }) {
  const navigate = useNavigate()

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
    onSuccess: () =>
      navigate({
        to: "/dashboard",
      }),
  })

  const onSubmit = handleSubmit(async (data) => {
    await mutateAsync(data)
  })

  return (
    <div className="flex w-full max-w-prose flex-col gap-6">
      <StepIndicator currentStep={4} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Activación de WhatsApp</CardTitle>
          <CardDescription>
            Asignamos un número exclusivo para tu negocio
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4">
              <HugeiconsIcon
                icon={SmartPhone01Icon}
                strokeWidth={2}
                className="mt-0.5 size-5 shrink-0 text-primary"
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  Número exclusivo para tu negocio
                </span>
                <p className="text-sm text-muted-foreground">
                  El equipo de wappiz te asignará un número de WhatsApp dedicado
                  para gestionar las reservas de tu negocio. Nos comunicaremos
                  por el correo que indiques a continuación. Si ya posees un
                  número de WhatsApp, puedes indicarlo en las notas y nos
                  comunicaremos contigo para el proceso de asignación.
                </p>
              </div>
            </div>

            <FieldGroup>
              <Controller
                control={control}
                name="contactEmail"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Correo de contacto
                    </FieldLabel>
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

            <div className="flex items-center gap-3 rounded-xl border px-4 py-3">
              <HugeiconsIcon
                icon={Clock01Icon}
                strokeWidth={2}
                className="size-5 shrink-0 text-muted-foreground"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  Tiempo de activación
                </span>
                <span className="text-sm text-muted-foreground">
                  2 horas hábiles
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button
                type="submit"
                className="ml-auto"
                disabled={isSubmitting}
                size="lg"
              >
                {isSubmitting && <Spinner />}
                Finalizar y explorar el panel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
