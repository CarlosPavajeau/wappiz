"use client"

import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { Appointment } from "@wappiz/api-client/types/appointments"
import { differenceInMinutes, format, formatDuration } from "date-fns"
import { es } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import { priceFormatter } from "@/lib/intl"

import { formatTime, isTerminalStatus } from "./appointment-utils"
import { StatusActionMenu } from "./status-action-menu"
import { StatusBadge } from "./status-badge"
import { AppointmentStatusHistory } from "./status-history"

type Props = {
  appointment: Appointment
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium break-words">
        {value}
      </dd>
    </div>
  )
}

function AppointmentSchedule({ appointment }: Props) {
  const start = new Date(appointment.startsAt)
  const end = new Date(appointment.endsAt)
  const totalMinutes = differenceInMinutes(end, start)
  const totalTime = formatDuration(
    { minutes: totalMinutes },
    {
      format: ["hours", "minutes"],
      locale: es,
    }
  )

  const dateLabel = format(start, "EEEE, d 'de' MMMM", { locale: es })
  const timeRange = `${formatTime(appointment.startsAt)} – ${formatTime(appointment.endsAt)}`

  return (
    <div className="rounded-lg bg-muted/50 px-4 py-3">
      <p className="text-sm font-medium capitalize">{dateLabel}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {timeRange} · {totalTime}
      </p>
    </div>
  )
}

function AppointmentFieldResponses({ appointment }: Props) {
  if (appointment.fieldResponses.length === 0) {
    return null
  }

  return (
    <section aria-labelledby="appointment-captured-data-heading">
      <h3
        id="appointment-captured-data-heading"
        className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
      >
        Datos adicionales
      </h3>
      <dl className="divide-y divide-border/60">
        {appointment.fieldResponses.map((field) => (
          <InfoRow
            key={field.fieldKey}
            label={field.question}
            value={field.response}
          />
        ))}
      </dl>
    </section>
  )
}

function AppointmentDetailContent({ appointment }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <AppointmentSchedule appointment={appointment} />

      <dl className="divide-y divide-border/60">
        <InfoRow label="Servicio" value={appointment.serviceName} />
        <InfoRow label="Profesional" value={appointment.resourceName} />
        <InfoRow
          label="Precio"
          value={priceFormatter.format(appointment.priceAtBooking)}
        />
      </dl>

      <AppointmentFieldResponses appointment={appointment} />

      <Collapsible className="border-t border-border/60 pt-3">
        <CollapsibleTrigger className="group flex w-full items-center justify-between py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Historial de estados
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={16}
            strokeWidth={2}
            className="transition-transform duration-200 group-data-panel-open:rotate-180"
            aria-hidden="true"
          />
        </CollapsibleTrigger>
        <CollapsiblePanel>
          <div className="pt-3">
            <AppointmentStatusHistory appointmentId={appointment.id} />
          </div>
        </CollapsiblePanel>
      </Collapsible>
    </div>
  )
}

type AppointmentDetailModalProps = {
  appointment: Appointment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppointmentDetailModal({
  appointment,
  open,
  onOpenChange,
}: AppointmentDetailModalProps) {
  const isMobile = useIsMobile()

  if (!appointment) {
    return null
  }

  const isTerminal = isTerminalStatus(appointment.status)

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2 text-left leading-tight">
              <span className="truncate">{appointment.customerName}</span>
              <StatusBadge status={appointment.status} />
            </DrawerTitle>
            <DrawerDescription className="text-left leading-snug">
              {appointment.serviceName}
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
            <AppointmentDetailContent appointment={appointment} />
          </div>

          <DrawerFooter>
            {!isTerminal && (
              <StatusActionMenu appointment={appointment} stacked />
            )}
            <DrawerClose asChild>
              <Button variant="outline">Cerrar</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(760px,calc(100dvh-2rem))] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/70 px-5 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2 leading-tight">
            <span className="truncate">{appointment.customerName}</span>
            <StatusBadge status={appointment.status} />
          </DialogTitle>
          <DialogDescription className="leading-snug">
            {appointment.serviceName}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <AppointmentDetailContent appointment={appointment} />
        </div>

        <DialogFooter
          className="m-0 flex-col rounded-none sm:flex-row"
          showCloseButton
        >
          {!isTerminal && <StatusActionMenu appointment={appointment} />}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
