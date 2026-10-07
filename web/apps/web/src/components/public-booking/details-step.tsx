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
import { Controller, useForm, useWatch } from "react-hook-form"

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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/client-api"
import {
  formatCurrency,
  formatPhoneNumber,
  parseColombianMobile,
} from "@/lib/intl"
import { formatDateIn, formatTimeIn } from "@/lib/time-zone"

const detailsSchema = type({
  // Messages are set per failure: a `.configure()` on the whole pipe doesn't
  // reach the length constraints, so arktype's English default leaked through.
  customerName: type("string").pipe((value, ctx) => {
    const name = value.trim()
    if (name.length === 0) {
      return ctx.error({ message: "Ingresa tu nombre" })
    }
    if (name.length < 2) {
      return ctx.error({ message: "Tu nombre debe tener al menos 2 letras" })
    }
    if (name.length > 100) {
      return ctx.error({ message: "Tu nombre no puede superar 100 caracteres" })
    }
    return name
  }),
  // Only Colombian WhatsApp numbers are supported for now.
  phoneNumber: type("string").pipe(
    (value, ctx) =>
      parseColombianMobile(value) ??
      ctx.error({ message: "Ingresa un celular colombiano de 10 dígitos" })
  ),
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
  const [verification, setVerification] = useState<Verification>({
    status: "pending",
  })
  const [turnstileKey, setTurnstileKey] = useState(0)
  const restartVerification = () => {
    setVerification({ status: "pending" })
    setTurnstileKey((key) => key + 1)
  }

  const { control, handleSubmit } = useForm<
    DetailsFormInput,
    unknown,
    DetailsFormValues
  >({
    defaultValues: { customerName: "", phoneNumber: "" },
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
    onError: restartVerification,
    onSuccess: (booking, { values }) => {
      queryClient.invalidateQueries({
        queryKey: ["public-booking", tenant.slug, "availability"],
      })
      onBooked(booking, toInternational(values))
    },
  })

  const onSubmit = handleSubmit((values) => {
    if (verification.status === "verified") {
      book({ token: verification.token, values })
    }
  })

  const typedPhone = useWatch({ control, name: "phoneNumber" })
  const confirmationNumber = parseColombianMobile(typedPhone)

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

          <Controller
            control={control}
            name="phoneNumber"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>WhatsApp</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText className="tabular-nums">
                      +57
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    {...field}
                    id={field.name}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    enterKeyHint="done"
                    placeholder="300 123 4567"
                    aria-invalid={fieldState.invalid}
                  />
                </InputGroup>
                <FieldError errors={[fieldState.error]} />
                <FieldDescription>
                  {confirmationNumber === null ? (
                    "Te enviaremos la confirmación de la cita a este número."
                  ) : (
                    <>
                      Te enviaremos la confirmación a{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {formatPhoneNumber(confirmationNumber)}
                      </span>
                    </>
                  )}
                </FieldDescription>
              </Field>
            )}
          />
        </FieldGroup>
      </form>

      <TurnstileChallenge
        key={turnstileKey}
        onSuccess={(token) => setVerification({ status: "verified", token })}
        onError={() => setVerification({ status: "failed" })}
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

      <SubmitButton
        isPending={isPending}
        onRetryVerification={restartVerification}
        verification={verification}
      />
    </section>
  )
}

function toInternational({ phoneNumber }: DetailsFormValues): string {
  return `+57${phoneNumber}`
}

type Verification =
  | { status: "pending" }
  | { status: "verified"; token: string }
  | { status: "failed" }

type SubmitButtonProps = {
  isPending: boolean
  onRetryVerification: () => void
  verification: Verification
}

/**
 * Booking needs a Turnstile token; until there is one the button says why it
 * can't be pressed instead of sitting there greyed out.
 */
function SubmitButton({
  isPending,
  onRetryVerification,
  verification,
}: SubmitButtonProps) {
  switch (verification.status) {
    case "pending": {
      return (
        <Button type="button" size="lg" disabled>
          <Spinner />
          Verificando…
        </Button>
      )
    }
    case "failed": {
      return (
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={onRetryVerification}
        >
          No pudimos verificarte, reintentar
        </Button>
      )
    }
    default: {
      return (
        <Button
          type="submit"
          form="public-booking-form"
          size="lg"
          disabled={isPending}
        >
          {isPending && <Spinner />}
          Agendar cita
        </Button>
      )
    }
  }
}
