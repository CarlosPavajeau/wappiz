"use client"

import type { Appointment } from "@wappiz/api-client/types/appointments"
import { differenceInMinutes, format, formatDuration } from "date-fns"
import { es } from "date-fns/locale"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Separator } from "@/components/ui/separator"
import { useIsMobile } from "@/hooks/use-mobile"
import { priceFormatter } from "@/lib/intl"

import { formatTime, statusLabel, statusVariant } from "./appointment-utils"

function DetailRow({
  label,
  value,
  subvalue,
}: {
  label: string
  value: string
  subvalue?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium">{value}</dd>
        {subvalue && (
          <dd className="text-xs text-muted-foreground">{subvalue}</dd>
        )}
      </div>
    </div>
  )
}

type Props = {
  appointment: Appointment
}

function AppointmentDetailContent({ appointment }: Readonly<Props>) {
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
    <div className="flex flex-col gap-4">
      <Badge
        variant={statusVariant(appointment.status)}
        className="w-fit rounded-sm"
      >
        {statusLabel(appointment.status)}
      </Badge>

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
    </div>
  )
}

export function AppointmentDetailModal({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: Appointment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const isMobile = useIsMobile()

  if (!appointment) {return null}

  const title = appointment.customerName
  const description = `${appointment.serviceName} · ${formatTime(appointment.startsAt)}`

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-2">
            <AppointmentDetailContent appointment={appointment} />
          </div>
          <DrawerFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <AppointmentDetailContent appointment={appointment} />
      </DialogContent>
    </Dialog>
  )
}
