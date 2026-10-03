import { arktypeResolver } from "@hookform/resolvers/arktype"
import { Alert02Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ApiError } from "@wappiz/api-client"
import type {
  AvailableSlot,
  BookAppointmentResponse,
  PublicService,
  PublicTenant,
} from "@wappiz/api-client/types/public-booking"
import { type } from "arktype"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"

import { TurnstileChallenge } from "@/components/auth/turnstile-challenge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
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
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/client-api"
import { formatCurrency } from "@/lib/intl"
import { formatDateIn, formatTimeIn } from "@/lib/time-zone"

const DIAL_CODES = [
  { code: "57", country: "Colombia" },
  { code: "52", country: "México" },
  { code: "51", country: "Perú" },
  { code: "593", country: "Ecuador" },
  { code: "56", country: "Chile" },
  { code: "54", country: "Argentina" },
  { code: "58", country: "Venezuela" },
  { code: "507", country: "Panamá" },
  { code: "506", country: "Costa Rica" },
  { code: "1", country: "EE. UU. / Canadá" },
  { code: "34", country: "España" },
] as const

const detailsSchema = type({
  customerName: type("string")
    .pipe((value) => value.trim())
    .to("2 <= string <= 100")
    .configure({ message: "Ingresa tu nombre" }),
  dialCode: "string",
  nationalNumber: type(/^[\d\s-]{6,14}$/u).configure({
    message: "Ingresa un número válido, solo dígitos",
  }),
})

type DetailsFormInput = typeof detailsSchema.inferIn
type DetailsFormValues = typeof detailsSchema.infer

type Props = {
  onBack: () => void
  onBooked: (booking: BookAppointmentResponse, phoneNumber: string) => void
  service: PublicService
  slot: AvailableSlot
  tenant: PublicTenant
}

export function DetailsStep({
  onBack,
  onBooked,
  service,
  slot,
  tenant,
}: Props) {
  const queryClient = useQueryClient()
  // Turnstile tokens are single use: after any failed attempt the widget is
  // remounted (new key) to issue a fresh one.
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileKey, setTurnstileKey] = useState(0)

  const { control, handleSubmit } = useForm<
    DetailsFormInput,
    unknown,
    DetailsFormValues
  >({
    defaultValues: { customerName: "", dialCode: "57", nationalNumber: "" },
    resolver: arktypeResolver(detailsSchema),
  })

  const {
    error,
    isPending,
    mutate: book,
  } = useMutation({
    mutationFn: ({
      token,
      values,
    }: {
      token: string
      values: DetailsFormValues
    }) =>
      api.publicBooking.book(tenant.slug, {
        customerName: values.customerName,
        phoneNumber: toInternational(values),
        resourceId: slot.resourceId,
        serviceId: service.id,
        startsAt: slot.startsAt,
        turnstileToken: token,
      }),
    onError: () => {
      setTurnstileToken(null)
      setTurnstileKey((key) => key + 1)
    },
    onSuccess: (booking, { values }) => {
      queryClient.invalidateQueries({
        queryKey: ["public-booking", tenant.slug, "availability"],
      })
      onBooked(booking, toInternational(values))
    },
  })

  const onSubmit = handleSubmit((values) => {
    if (turnstileToken !== null) {
      book({ token: turnstileToken, values })
    }
  })

  const slotTaken = error instanceof ApiError && error.status === 409

  const backToSlots = () => {
    queryClient.invalidateQueries({
      queryKey: ["public-booking", tenant.slug, "availability"],
    })
    onBack()
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Volver a horarios"
          onClick={onBack}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
        </Button>
        <h2 className="text-base font-medium">Confirma tus datos</h2>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg border bg-card p-4 text-sm">
        <dt className="text-muted-foreground">Servicio</dt>
        <dd className="text-right font-medium">{service.name}</dd>
        <dt className="text-muted-foreground">Con</dt>
        <dd className="text-right font-medium">{slot.resourceName}</dd>
        <dt className="text-muted-foreground">Fecha</dt>
        <dd className="text-right font-medium first-letter:uppercase">
          {formatDateIn(slot.startsAt, tenant.timezone)}
        </dd>
        <dt className="text-muted-foreground">Hora</dt>
        <dd className="text-right font-medium">
          {formatTimeIn(slot.startsAt, tenant.timezone)}
        </dd>
        <dt className="text-muted-foreground">Precio</dt>
        <dd className="text-right font-medium tabular-nums">
          {formatCurrency(service.price, tenant.currency)}
        </dd>
      </dl>

      <form id="public-booking-form" onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <Controller
            control={control}
            name="customerName"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nombre</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  autoComplete="name"
                  placeholder="Tu nombre"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Field>
            <FieldLabel htmlFor="nationalNumber">WhatsApp</FieldLabel>
            <div className="flex gap-2">
              <Controller
                control={control}
                name="dialCode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      className="w-24 shrink-0"
                      aria-label="Código de país"
                    >
                      <SelectValue>+{field.value}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {DIAL_CODES.map((dial) => (
                        <SelectItem key={dial.code} value={dial.code}>
                          +{dial.code} {dial.country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Controller
                control={control}
                name="nationalNumber"
                render={({ field, fieldState }) => (
                  <Input
                    {...field}
                    id={field.name}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="300 123 4567"
                    aria-invalid={fieldState.invalid}
                  />
                )}
              />
            </div>
            <Controller
              control={control}
              name="nationalNumber"
              render={({ fieldState }) => (
                <FieldError errors={[fieldState.error]} />
              )}
            />
            <FieldDescription>
              Te enviaremos la confirmación de la cita a este número.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>

      <TurnstileChallenge
        key={turnstileKey}
        onSuccess={setTurnstileToken}
        onError={() => setTurnstileToken(null)}
      />

      {error !== null && (
        <Alert variant="destructive">
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
          <AlertTitle>No se pudo agendar la cita</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError
              ? error.message
              : "Revisa tu conexión e intenta de nuevo."}
            {slotTaken && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={backToSlots}
              >
                Elegir otro horario
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        form="public-booking-form"
        size="lg"
        disabled={isPending || turnstileToken === null}
      >
        {isPending && <Spinner />}
        Agendar cita
      </Button>
    </section>
  )
}

function toInternational({
  dialCode,
  nationalNumber,
}: DetailsFormValues): string {
  return `+${dialCode}${nationalNumber.replaceAll(/\D/gu, "")}`
}
