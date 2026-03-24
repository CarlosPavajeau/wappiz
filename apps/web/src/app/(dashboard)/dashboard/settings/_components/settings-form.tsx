"use client"

import { arktypeResolver } from "@hookform/resolvers/arktype"
import { useMutation } from "@tanstack/react-query"
import type { TenantSettings } from "@wappiz/api-client/types/tenants"
import { type } from "arktype"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/client-api"

const settingsSchema = type({
  "autoBlockAfterLateCancel?": type("number > 0").configure({
    message: "Debe ser al menos 1",
  }),
  "autoBlockAfterNoShows?": type("number > 0").configure({
    message: "Debe ser al menos 1",
  }),
  "botName?": "string",
  "cancellationMessage?": "string",
  "contactEmail?": type("string.email | string == 0").configure({
    message: "Ingresa un correo electrónico válido",
  }),
  "lateCancelHours?": type("number >= 0").configure({
    message: "Debe ser 0 o más",
  }),
  "sendWarningBeforeBlock?": "boolean",
  "welcomeMessage?": "string",
})

type SettingsFormValues = typeof settingsSchema.infer

type Props = {
  defaultValues: TenantSettings
}

export function SettingsForm({ defaultValues }: Props) {
  const router = useRouter()

  const form = useForm<SettingsFormValues>({
    defaultValues,
    resolver: arktypeResolver(settingsSchema),
  })

  const { mutate: updateSettings, isPending } = useMutation({
    mutationFn: (values: SettingsFormValues) =>
      api.tenants.updateSettings(values),
    onError: () => {
      toast.error("Error al guardar los ajustes. Intenta de nuevo.")
    },
    onSuccess: () => {
      toast.success("Ajustes guardados correctamente.")
      router.refresh()
    },
  })

  const onSubmit = form.handleSubmit((values) => updateSettings(values))

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <FieldSet>
        <FieldLegend>Chatbot</FieldLegend>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="botName">Nombre del bot</FieldLabel>
            <FieldDescription>
              Nombre con el que el asistente se presenta a los clientes.
            </FieldDescription>
            <Input
              id="botName"
              placeholder="Asistente"
              aria-invalid={!!form.formState.errors.botName}
              aria-describedby={
                form.formState.errors.botName ? "botName-error" : undefined
              }
              {...form.register("botName")}
            />
            <FieldError
              id="botName-error"
              errors={[form.formState.errors.botName]}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="welcomeMessage">
              Mensaje de bienvenida
            </FieldLabel>
            <FieldDescription>
              Primer mensaje que reciben los clientes al iniciar una
              conversación.
            </FieldDescription>
            <Textarea
              id="welcomeMessage"
              placeholder="¡Hola! ¿En qué puedo ayudarte hoy?"
              aria-invalid={!!form.formState.errors.welcomeMessage}
              aria-describedby={
                form.formState.errors.welcomeMessage
                  ? "welcomeMessage-error"
                  : undefined
              }
              {...form.register("welcomeMessage")}
            />
            <FieldError
              id="welcomeMessage-error"
              errors={[form.formState.errors.welcomeMessage]}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="cancellationMessage">
              Mensaje de cancelación
            </FieldLabel>
            <FieldDescription>
              Mensaje enviado al cliente cuando se cancela una cita.
            </FieldDescription>
            <Textarea
              id="cancellationMessage"
              placeholder="Tu cita ha sido cancelada. Escríbenos para reagendar."
              aria-invalid={!!form.formState.errors.cancellationMessage}
              aria-describedby={
                form.formState.errors.cancellationMessage
                  ? "cancellationMessage-error"
                  : undefined
              }
              {...form.register("cancellationMessage")}
            />
            <FieldError
              id="cancellationMessage-error"
              errors={[form.formState.errors.cancellationMessage]}
            />
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>Contacto</FieldLegend>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="contactEmail">
              Correo electrónico de contacto
            </FieldLabel>
            <FieldDescription>
              Dirección de correo para notificaciones y comunicaciones del
              sistema.
            </FieldDescription>
            <Input
              id="contactEmail"
              type="email"
              placeholder="hola@miempresa.com"
              aria-invalid={!!form.formState.errors.contactEmail}
              aria-describedby={
                form.formState.errors.contactEmail
                  ? "contactEmail-error"
                  : undefined
              }
              {...form.register("contactEmail")}
            />
            <FieldError
              id="contactEmail-error"
              errors={[form.formState.errors.contactEmail]}
            />
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>Políticas de cancelación y bloqueo</FieldLegend>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="lateCancelHours">
              Horas para cancelación tardía
            </FieldLabel>
            <FieldDescription>
              Horas previas a la cita a partir de las cuales se considera una
              cancelación tardía.
            </FieldDescription>
            <Input
              id="lateCancelHours"
              type="number"
              min={0}
              aria-invalid={!!form.formState.errors.lateCancelHours}
              aria-describedby={
                form.formState.errors.lateCancelHours
                  ? "lateCancelHours-error"
                  : undefined
              }
              {...form.register("lateCancelHours", { valueAsNumber: true })}
            />
            <FieldError
              id="lateCancelHours-error"
              errors={[form.formState.errors.lateCancelHours]}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="autoBlockAfterNoShows">
              Bloquear tras inasistencias
            </FieldLabel>
            <FieldDescription>
              Número de inasistencias acumuladas antes de bloquear
              automáticamente al cliente.
            </FieldDescription>
            <Input
              id="autoBlockAfterNoShows"
              type="number"
              min={1}
              aria-invalid={!!form.formState.errors.autoBlockAfterNoShows}
              aria-describedby={
                form.formState.errors.autoBlockAfterNoShows
                  ? "autoBlockAfterNoShows-error"
                  : undefined
              }
              {...form.register("autoBlockAfterNoShows", {
                valueAsNumber: true,
              })}
            />
            <FieldError
              id="autoBlockAfterNoShows-error"
              errors={[form.formState.errors.autoBlockAfterNoShows]}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="autoBlockAfterLateCancel">
              Bloquear tras cancelaciones tardías
            </FieldLabel>
            <FieldDescription>
              Número de cancelaciones tardías acumuladas antes de bloquear
              automáticamente al cliente.
            </FieldDescription>
            <Input
              id="autoBlockAfterLateCancel"
              type="number"
              min={1}
              aria-invalid={!!form.formState.errors.autoBlockAfterLateCancel}
              aria-describedby={
                form.formState.errors.autoBlockAfterLateCancel
                  ? "autoBlockAfterLateCancel-error"
                  : undefined
              }
              {...form.register("autoBlockAfterLateCancel", {
                valueAsNumber: true,
              })}
            />
            <FieldError
              id="autoBlockAfterLateCancel-error"
              errors={[form.formState.errors.autoBlockAfterLateCancel]}
            />
          </Field>

          <Field orientation="horizontal">
            <Controller
              control={form.control}
              name="sendWarningBeforeBlock"
              render={({ field }) => (
                <Checkbox
                  id="sendWarningBeforeBlock"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
              )}
            />
            <FieldLabel htmlFor="sendWarningBeforeBlock">
              Enviar advertencia antes de bloquear
            </FieldLabel>
          </Field>
        </FieldGroup>
      </FieldSet>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar ajustes"}
        </Button>
      </div>
    </form>
  )
}
