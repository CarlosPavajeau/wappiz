import type {
  AvailableSlot,
  BookAppointmentResponse,
  PublicService,
  PublicTenant,
} from "@wappiz/api-client/types/public-booking"
import { useState } from "react"

import { todayIn } from "@/lib/time-zone"

import { BookingConfirmed } from "./booking-confirmed"
import { DetailsStep } from "./details-step"
import { ServiceStep } from "./service-step"
import { SlotStep } from "./slot-step"
import type { SlotSelection } from "./slot-step"

/**
 * Each step carries exactly what the previous steps decided, so a step can
 * never render without its inputs (e.g. details without a slot).
 */
type Step =
  | { kind: "service" }
  | { kind: "slot"; selection: SlotSelection; service: PublicService }
  | {
      kind: "details"
      selection: SlotSelection
      service: PublicService
      slot: AvailableSlot
    }
  | { booking: BookAppointmentResponse; kind: "confirmed"; phoneNumber: string }

const STEP_NUMBER = {
  confirmed: 3,
  details: 3,
  service: 1,
  slot: 2,
} as const satisfies Record<Step["kind"], number>

type Props = {
  tenant: PublicTenant
}

export function BookingFlow({ tenant }: Props) {
  const [step, setStep] = useState<Step>({ kind: "service" })

  const selectService = (service: PublicService) =>
    setStep({
      kind: "slot",
      selection: { day: todayIn(tenant.timezone), resourceId: null },
      service,
    })

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Reserva tu cita
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {tenant.name}
        </h1>
        {step.kind !== "confirmed" && (
          <p className="text-sm text-muted-foreground">
            Paso {STEP_NUMBER[step.kind]} de 3
          </p>
        )}
      </header>

      {step.kind === "service" && (
        <ServiceStep
          currency={tenant.currency}
          onSelect={selectService}
          services={tenant.services}
        />
      )}

      {step.kind === "slot" && (
        <SlotStep
          onBack={() => setStep({ kind: "service" })}
          onPick={(slot) =>
            setStep({
              kind: "details",
              selection: step.selection,
              service: step.service,
              slot,
            })
          }
          onSelectionChange={(selection) => setStep({ ...step, selection })}
          selection={step.selection}
          service={step.service}
          tenant={tenant}
        />
      )}

      {step.kind === "details" && (
        <DetailsStep
          onBack={() =>
            setStep({
              kind: "slot",
              selection: step.selection,
              service: step.service,
            })
          }
          onBooked={(booking, phoneNumber) =>
            setStep({ booking, kind: "confirmed", phoneNumber })
          }
          service={step.service}
          slot={step.slot}
          tenant={tenant}
        />
      )}

      {step.kind === "confirmed" && (
        <BookingConfirmed
          booking={step.booking}
          onBookAnother={() => setStep({ kind: "service" })}
          phoneNumber={step.phoneNumber}
          timeZone={tenant.timezone}
        />
      )}

      <footer className="pt-4 text-center text-xs text-muted-foreground">
        Reservas con{" "}
        <a href="/" className="font-medium underline-offset-4 hover:underline">
          wappiz
        </a>
      </footer>
    </div>
  )
}
