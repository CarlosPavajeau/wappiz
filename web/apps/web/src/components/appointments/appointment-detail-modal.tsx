"use client"

import type { Appointment } from "@wappiz/api-client/types/appointments"
import { differenceInMinutes, format, formatDuration } from "date-fns"
import { es } from "date-fns/locale"

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
import { Separator } from "@/components/ui/separator"
import { useIsMobile } from "@/hooks/use-mobile"
import { priceFormatter } from "@/lib/intl"

import { formatTime, isTerminalStatus } from "./appointment-utils"
import { StatusActionMenu } from "./status-action-menu"
import { StatusBadge } from "./status-badge"
import { AppointmentStatusHistory } from "./status-history"

type Props = {
  appointment: Appointment
}

function AppointmentFieldResponses({ appointment }: Props) {
  if (appointment.fieldResponses.length === 0) {
    return null
  }

  return (
    <>
      <Separator />

      <section aria-labelledby="captured-data-heading">
        <h3
          id="captured-data-heading"
          className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
        >
          Datos capturados
        </h3>

        <dl className="flex flex-col gap-3">
          {appointment.fieldResponses.map((field) => (
            <div key={field.fieldKey} className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">
                {field.question}
              </dt>
              <dd className="text-sm font-medium wrap-break-word whitespace-pre-wrap">
                {field.response}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  )
}

function AppointmentDetailContent({ appointment }: Props) {
  const start = new Date(appointment.startsAt)
  const end = new Date(appointment.endsAt)
  const totalMinutes = differenceInMinutes(end, start)
  const totalTime = formatDuration(
    { minutes: totalMinutes },
    {
      format: ["minutes", "hours"],
      locale: es,
    }
  )

  const formattedPrice = priceFormatter.format(appointment.priceAtBooking)
  const dateLabel = format(start, "dd/MM/yyyy")

  return (
    <div className="flex flex-col gap-5">
      <StatusBadge status={appointment.status} />

      <Separator />

      <dl className="flex flex-col gap-3">
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

      <AppointmentFieldResponses appointment={appointment} />

      <Separator />

      <section aria-labelledby="history-heading">
        <h3
          id="history-heading"
          className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
        >
          Historial de estados
        </h3>

        <AppointmentStatusHistory appointmentId={appointment.id} />
      </section>
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
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-left">{title}</DrawerTitle>
            <DrawerDescription className="text-left">
              {description}
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-5 pb-6">
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <AppointmentDetailContent appointment={appointment} />
        </div>

        <DialogFooter className="flex-col sm:flex-col" showCloseButton>
          {!isTerminal && <StatusActionMenu appointment={appointment} />}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
