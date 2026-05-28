"use client"

import type { Appointment } from "@wappiz/api-client/types/appointments"
import { differenceInMinutes, format, formatDuration } from "date-fns"
import { es } from "date-fns/locale"
import type { ReactNode } from "react"

import { DetailRow } from "@/components/detail-row"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"

import { formatTime, isTerminalStatus } from "./appointment-utils"
import { StatusActionMenu } from "./status-action-menu"
import { StatusBadge } from "./status-badge"
import { AppointmentStatusHistory } from "./status-history"

type Props = {
  appointment: Appointment
}

type SectionProps = {
  children: ReactNode
  className?: string
  headingId: string
  title: string
}

function AppointmentDetailSection({
  children,
  className,
  headingId,
  title,
}: SectionProps) {
  return (
    <section className={cn("min-w-0", className)} aria-labelledby={headingId}>
      <h3
        id={headingId}
        className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
      >
        {title}
      </h3>
      {children}
    </section>
  )
}

function AppointmentFieldResponses({ appointment }: Props) {
  if (appointment.fieldResponses.length === 0) {
    return null
  }

  return (
    <AppointmentDetailSection
      headingId="appointment-captured-data-heading"
      title="Datos adicionales"
    >
      <dl className="grid gap-2 sm:grid-cols-2">
        {appointment.fieldResponses.map((field) => (
          <DetailRow
            key={field.fieldKey}
            label={field.question}
            value={field.response}
          />
        ))}
      </dl>
    </AppointmentDetailSection>
  )
}

function AppointmentDetailContent({ appointment }: Props) {
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

  const formattedPrice = priceFormatter.format(appointment.priceAtBooking)
  const dateLabel = format(start, "dd/MM/yyyy")

  return (
    <div className="flex min-h-0 flex-col gap-5">
      <div className="grid min-h-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.85fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <AppointmentDetailSection
            headingId="appointment-information-heading"
            title="Información"
          >
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="Cliente" value={appointment.customerName} />
              <DetailRow label="Servicio" value={appointment.serviceName} />
              <DetailRow label="Profesional" value={appointment.resourceName} />
              <DetailRow
                label="Horario"
                value={`${formatTime(appointment.startsAt)} – ${formatTime(appointment.endsAt)}`}
                subvalue={`${dateLabel} · ${totalTime}`}
              />
              <DetailRow label="Precio" value={formattedPrice} />
            </dl>
          </AppointmentDetailSection>

          <AppointmentFieldResponses appointment={appointment} />
        </div>

        <div className="min-w-0 lg:border-l lg:border-border/70 lg:pl-5">
          <AppointmentDetailSection
            headingId="appointment-history-heading"
            title="Historial de estados"
          >
            <AppointmentStatusHistory appointmentId={appointment.id} />
          </AppointmentDetailSection>
        </div>
      </div>
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

  const title = appointment.customerName
  const description = `${appointment.serviceName} · ${formatTime(appointment.startsAt)}`
  const isTerminal = isTerminalStatus(appointment.status)

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle className="text-left leading-tight">
              {title}
            </DrawerTitle>
            <DrawerDescription className="flex items-center gap-2 text-left leading-snug">
              {description}
              <StatusBadge status={appointment.status} />
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
            <AppointmentDetailContent appointment={appointment} />
          </div>

          <DrawerFooter>
            {!isTerminal && <StatusActionMenu appointment={appointment} />}
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
      <DialogContent className="max-h-[min(760px,calc(100dvh-2rem))] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border/70 px-5 py-4 pr-12">
          <DialogTitle className="truncate leading-tight">{title}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 leading-snug">
            {description}
            <StatusBadge status={appointment.status} />
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
