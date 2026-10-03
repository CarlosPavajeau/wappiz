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
import { ResourceStep } from "./resource-step"
import { offersResourceChoice, resourcesFor } from "./resources"
import { initialCatalogView, ServiceStep } from "./service-step"
import type { CatalogView } from "./service-step"
import { SlotStep } from "./slot-step"
import type { SlotSelection } from "./slot-step"

/**
 * Each step carries exactly what the previous steps decided, so a step can
 * never render without its inputs (e.g. details without a slot).
 */
type Step =
  | { kind: "service" }
  | { kind: "resource"; service: PublicService }
  | { kind: "slot"; selection: SlotSelection; service: PublicService }
  | {
      kind: "details"
      selection: SlotSelection
      service: PublicService
      slot: AvailableSlot
    }
  | { booking: BookAppointmentResponse; kind: "confirmed"; phoneNumber: string }

type ProgressStep = Exclude<Step, { kind: "confirmed" }>

/**
 * The "who" step only exists for services with more than one resource, so
 * the total depends on the chosen service. Before one is chosen, count it if
 * any service would show it.
 */
function progress(step: ProgressStep, tenant: PublicTenant) {
  const withResource =
    step.kind === "service"
      ? tenant.services.some((service) => offersResourceChoice(tenant, service))
      : offersResourceChoice(tenant, step.service)
  const total = withResource ? 4 : 3

  const current = {
    details: total,
    resource: 2,
    service: 1,
    slot: withResource ? 3 : 2,
  } satisfies Record<ProgressStep["kind"], number>

  return { current: current[step.kind], total }
}

type Props = {
  tenant: PublicTenant
}

export function BookingFlow({ tenant }: Props) {
  const [step, setStep] = useState<Step>({ kind: "service" })
  const [catalogView, setCatalogView] =
    useState<CatalogView>(initialCatalogView)

  const pickSlotFor = (service: PublicService, resourceId: string | null) =>
    setStep({
      kind: "slot",
      selection: { day: todayIn(tenant.timezone), resourceId },
      service,
    })

  const selectService = (service: PublicService) =>
    offersResourceChoice(tenant, service)
      ? setStep({ kind: "resource", service })
      : pickSlotFor(service, null)

  const backFromSlot = (service: PublicService) =>
    offersResourceChoice(tenant, service)
      ? setStep({ kind: "resource", service })
      : setStep({ kind: "service" })

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
          <StepProgress step={step} tenant={tenant} />
        )}
      </header>

      {step.kind === "service" && (
        <ServiceStep
          currency={tenant.currency}
          onSelect={selectService}
          onViewChange={setCatalogView}
          services={tenant.services}
          view={catalogView}
        />
      )}

      {step.kind === "resource" && (
        <ResourceStep
          onBack={() => setStep({ kind: "service" })}
          onPick={(resourceId) => pickSlotFor(step.service, resourceId)}
          resources={resourcesFor(tenant, step.service)}
          service={step.service}
        />
      )}

      {step.kind === "slot" && (
        <SlotStep
          onBack={() => backFromSlot(step.service)}
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
          onBookAnother={() => {
            setCatalogView(initialCatalogView)
            setStep({ kind: "service" })
          }}
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

function StepProgress({
  step,
  tenant,
}: {
  step: ProgressStep
  tenant: PublicTenant
}) {
  const { current, total } = progress(step, tenant)
  return (
    <p className="text-sm text-muted-foreground">
      Paso {current} de {total}
    </p>
  )
}
