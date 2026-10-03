import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { BookAppointmentResponse } from "@wappiz/api-client/types/public-booking"

import { Button } from "@/components/ui/button"
import { formatPhoneNumber } from "@/lib/intl"
import { formatDateIn, formatTimeIn } from "@/lib/time-zone"

type Props = {
  booking: BookAppointmentResponse
  onBookAnother: () => void
  phoneNumber: string
  timeZone: string
}

export function BookingConfirmed({
  booking,
  onBookAnother,
  phoneNumber,
  timeZone,
}: Props) {
  return (
    <section
      aria-live="polite"
      className="flex flex-col items-center gap-4 rounded-lg border bg-card p-6 text-center"
    >
      <HugeiconsIcon
        icon={CheckmarkCircle02Icon}
        strokeWidth={2}
        className="size-12 text-primary"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">¡Tu cita está agendada!</h2>
        <p className="text-sm text-muted-foreground">
          {booking.serviceName} con {booking.resourceName}
        </p>
        <p className="font-medium first-letter:uppercase">
          {formatDateIn(booking.startsAt, timeZone)} a las{" "}
          {formatTimeIn(booking.startsAt, timeZone)}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Te enviamos la confirmación por WhatsApp al{" "}
        <span className="font-medium text-foreground">
          {formatPhoneNumber(phoneNumber)}
        </span>
        .
      </p>
      <Button type="button" variant="outline" onClick={onBookAnother}>
        Agendar otra cita
      </Button>
    </section>
  )
}
