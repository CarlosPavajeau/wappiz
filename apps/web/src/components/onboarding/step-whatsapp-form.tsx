import { arktypeResolver } from "@hookform/resolvers/arktype"
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { type } from "arktype"
import { isAxiosError } from "axios"
import { ChevronLeft, Clock, Loader2, Smartphone } from "lucide-react"
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
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WhatsAppFormData>({
    defaultValues: {
      contactEmail: initialEmail,
      notes: "",
    },
    resolver: arktypeResolver(whatsappSchema),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: WhatsAppFormData) =>
      api.onboarding.completeStep4({
        contactEmail: data.contactEmail,
        ...(data.notes ? { notes: data.notes } : {}),
      }),
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data?.message ??
          "No se pudo enviar. Intenta de nuevo.")
        : "Algo salió mal. Intenta de nuevo."
      toast.error(message)
    },
    onSuccess: () =>
      navigate({
        to: "/dashboard",
      }),
  })

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator currentStep={4} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Activación de WhatsApp</CardTitle>
          <CardDescription>
            Asignamos un número exclusivo para tu barbería
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            noValidate
            onSubmit={handleSubmit((data) => mutate(data))}
            className="flex flex-col gap-5"
          >
            <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4">
              <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  Número exclusivo para tu negocio
                </span>
                <p className="text-sm text-muted-foreground">
                  El equipo de wappiz te asignará un número de WhatsApp dedicado
                  para gestionar las reservas de tu barbería. Nos comunicaremos
                  por el correo que indiques a continuación.
                </p>
              </div>
            </div>

            <FieldGroup>
              <Field data-invalid={!!errors.contactEmail}>
                <FieldLabel htmlFor="contactEmail">
                  Correo de contacto
                </FieldLabel>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  aria-invalid={!!errors.contactEmail}
                  {...register("contactEmail")}
                />
                <FieldError errors={[errors.contactEmail]} />
              </Field>

              <Field data-invalid={!!errors.notes}>
                <FieldLabel htmlFor="notes">
                  Notas adicionales{" "}
                  <span className="font-normal text-muted-foreground">
                    (opcional)
                  </span>
                </FieldLabel>
                <Textarea
                  id="notes"
                  placeholder="Ej. Prefiero que me contacten en la mañana…"
                  aria-invalid={!!errors.notes}
                  {...register("notes")}
                />
                <FieldError errors={[errors.notes]} />
              </Field>
            </FieldGroup>

            <div className="flex items-center gap-3 rounded-xl border px-4 py-3">
              <Clock className="size-5 shrink-0 text-muted-foreground" />
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
              <button
                type="button"
                onClick={() =>
                  navigate({
                    params: { step: "3" },
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
                Finalizar y explorar el panel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
