import { arktypeResolver } from "@hookform/resolvers/arktype"
import {
  ChatBotIcon,
  Mail01Icon,
  Shield01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import type { TenantSettings } from "@wappiz/api-client/types/tenants"
import { type } from "arktype"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIsMobile } from "@/hooks/use-mobile"
import { api } from "@/lib/client-api"

import { Spinner } from "../ui/spinner"

const settingsSchema = type({
  "autoBlockAfterLateCancel?": type("number > 0").configure({
    message: "Debe ser al menos 1",
  }),
  "autoBlockAfterNoShows?": type("number > 0").configure({
    message: "Debe ser al menos 1",
  }),
  "botName?": "string | undefined",
  "cancellationMessage?": "string | undefined",
  "contactEmail?": type("string.email | string == 0 | undefined").configure({
    message: "Ingresa un correo electrónico válido",
  }),
  "lateCancelHours?": type("number >= 0").configure({
    message: "Debe ser 0 o más",
  }),
  "sendWarningBeforeBlock?": "boolean",
  "welcomeMessage?": "string | undefined",
})

type SettingsFormValues = typeof settingsSchema.infer

type Props = {
  defaultValues: TenantSettings
}

export function SettingsForm({ defaultValues }: Props) {
  const router = useRouter()
  const isMobile = useIsMobile()

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SettingsFormValues>({
    defaultValues,
    resolver: arktypeResolver(settingsSchema),
  })

  const { mutateAsync: updateSettings } = useMutation({
    mutationFn: (values: SettingsFormValues) =>
      api.tenants.updateSettings(values),
    onError: () => {
      toast.error("Error al guardar los ajustes. Intenta de nuevo.")
    },
    onSuccess: () => {
      toast.success("Ajustes guardados correctamente.")
      router.invalidate()
    },
  })

  const onSubmit = handleSubmit(async (values) => await updateSettings(values))

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Tabs
        defaultValue="chatbot"
        orientation={isMobile ? "horizontal" : "vertical"}
      >
        <TabsList className={isMobile ? "w-full" : "w-40 shrink-0"}>
          <TabsTrigger value="chatbot">
            <HugeiconsIcon
              icon={ChatBotIcon}
              strokeWidth={2}
              aria-hidden="true"
            />
            Chatbot
          </TabsTrigger>
          <TabsTrigger value="contacto">
            <HugeiconsIcon
              icon={Mail01Icon}
              strokeWidth={2}
              aria-hidden="true"
            />
            Contacto
          </TabsTrigger>
          <TabsTrigger value="politicas">
            <HugeiconsIcon
              icon={Shield01Icon}
              strokeWidth={2}
              aria-hidden="true"
            />
            Políticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chatbot" className="min-w-0 pt-6 sm:pt-0 sm:pl-8">
          <FieldSet>
            <FieldLegend className="sr-only">Chatbot</FieldLegend>
            <FieldGroup>
              <Controller
                control={control}
                name="botName"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Nombre del bot</FieldLabel>
                    <FieldDescription>
                      Nombre con el que el asistente se presenta a los clientes.
                    </FieldDescription>
                    <Input
                      {...field}
                      id={field.name}
                      placeholder="Asistente"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="welcomeMessage"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Mensaje de bienvenida
                    </FieldLabel>
                    <FieldDescription>
                      Primer mensaje que reciben los clientes al iniciar una
                      conversación.
                    </FieldDescription>
                    <Input
                      {...field}
                      id={field.name}
                      placeholder="¡Hola! ¿En qué puedo ayudarte hoy?"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="cancellationMessage"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Mensaje de cancelación
                    </FieldLabel>
                    <FieldDescription>
                      Mensaje enviado al cliente cuando se cancela una cita.
                    </FieldDescription>
                    <Input
                      {...field}
                      id={field.name}
                      placeholder="Tu cita ha sido cancelada. Escríbenos para reagendar."
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </FieldGroup>
          </FieldSet>
        </TabsContent>

        <TabsContent value="contacto" className="min-w-0 pt-6 sm:pt-0 sm:pl-8">
          <FieldSet>
            <FieldLegend className="sr-only">Contacto</FieldLegend>
            <FieldGroup>
              <Controller
                control={control}
                name="contactEmail"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Correo electrónico de contacto
                    </FieldLabel>
                    <FieldDescription>
                      Dirección de correo para notificaciones y comunicaciones
                      del sistema.
                    </FieldDescription>
                    <Input
                      {...field}
                      id={field.name}
                      type="email"
                      placeholder="hola@miempresa.com"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </FieldGroup>
          </FieldSet>
        </TabsContent>

        <TabsContent value="politicas" className="min-w-0 pt-6 sm:pt-0 sm:pl-8">
          <FieldSet>
            <FieldLegend className="sr-only">
              Políticas de cancelación y bloqueo
            </FieldLegend>
            <FieldGroup>
              <Controller
                control={control}
                name="lateCancelHours"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Horas para cancelación tardía
                    </FieldLabel>
                    <FieldDescription>
                      Horas previas a la cita a partir de las cuales se
                      considera una cancelación tardía.
                    </FieldDescription>
                    <Input
                      {...field}
                      id={field.name}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      aria-invalid={fieldState.invalid}
                      onChange={(e) => {
                        const val = e.target.value
                        field.onChange(val === "" ? "" : Number(val))
                      }}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="autoBlockAfterNoShows"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Bloquear tras inasistencias
                    </FieldLabel>
                    <FieldDescription>
                      Número de inasistencias acumuladas antes de bloquear
                      automáticamente al cliente.
                    </FieldDescription>
                    <Input
                      {...field}
                      id={field.name}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      aria-invalid={fieldState.invalid}
                      onChange={(e) => {
                        const val = e.target.value
                        field.onChange(val === "" ? "" : Number(val))
                      }}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="autoBlockAfterLateCancel"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Bloquear tras cancelaciones tardías
                    </FieldLabel>
                    <FieldDescription>
                      Número de cancelaciones tardías acumuladas antes de
                      bloquear automáticamente al cliente.
                    </FieldDescription>
                    <Input
                      {...field}
                      id={field.name}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      aria-invalid={fieldState.invalid}
                      onChange={(e) => {
                        const val = e.target.value
                        field.onChange(val === "" ? "" : Number(val))
                      }}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="sendWarningBeforeBlock"
                render={({ field, fieldState }) => (
                  <Field
                    data-invalid={fieldState.invalid}
                    orientation="horizontal"
                  >
                    <Checkbox
                      id="sendWarningBeforeBlock"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked)}
                    />
                    <FieldLabel htmlFor="sendWarningBeforeBlock">
                      Enviar advertencia antes de bloquear
                    </FieldLabel>
                  </Field>
                )}
              />
            </FieldGroup>
          </FieldSet>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-6">
        <Button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="w-full sm:w-auto"
          size="lg"
        >
          {isSubmitting && <Spinner />}
          Guardar ajustes
        </Button>
      </div>
    </form>
  )
}
