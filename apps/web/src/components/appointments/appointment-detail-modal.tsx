"use client"

import { useQuery } from "@tanstack/react-query"
import type {
  Appointment,
  AppointmentStatusHistory,
} from "@wappiz/api-client/types/appointments"
import { differenceInMinutes, format, formatDuration } from "date-fns"
import { es } from "date-fns/locale"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/client-api"
import { priceFormatter } from "@/lib/intl"

import { formatTime } from "./appointment-utils"
import { StatusBadge } from "./status-badge"

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

function HistoryItem({ entry }: { entry: AppointmentStatusHistory }) {
  const date = format(new Date(entry.createdAt), "dd/MM/yyyy · h:mm a")

  return (
    <li className="flex gap-3">
      <div aria-hidden className="flex flex-col items-center">
        <div className="mt-1 size-2 shrink-0 rounded-full bg-border ring-2 ring-background" />
        <div className="mt-1 w-px flex-1 bg-border last:hidden" />
      </div>
      <div className="flex flex-col gap-1 pb-4">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <StatusBadge status={entry.fromStatus} />
          <span className="text-muted-foreground" aria-label="hacia">
            →
          </span>
          <StatusBadge status={entry.toStatus} />
        </div>
        <p className="text-xs text-muted-foreground">
          {entry.changedBy}
          {entry.changedByRole ? ` · ${entry.changedByRole}` : ""}
        </p>
        {entry.reason ? (
          <p className="text-xs text-foreground/70 italic">"{entry.reason}"</p>
        ) : null}
        <time
          className="text-xs text-muted-foreground/60"
          dateTime={entry.createdAt}
        >
          {date}
        </time>
      </div>
    </li>
  )
}

function HistorySkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy
      aria-label="Cargando historial"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <Skeleton className="mt-1 size-2 rounded-full" />
            <Skeleton className="mt-1 w-px flex-1" />
          </div>
          <div className="flex flex-col gap-1.5 pb-4">
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

function AppointmentDetailContent({
  appointment,
}: {
  appointment: Appointment
}) {
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

  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryFn: () => api.appointments.history(appointment.id),
    queryKey: ["appointments", appointment.id, "history"],
  })

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

      <Separator />

      <section aria-labelledby="history-heading">
        <h3
          id="history-heading"
          className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Historial de estados
        </h3>

        {isLoadingHistory ? (
          <HistorySkeleton />
        ) : history && history.length > 0 ? (
          <ol className="flex flex-col">
            {history.map((entry) => (
              <HistoryItem key={entry.id} entry={entry} />
            ))}
          </ol>
        ) : (
          <Empty className="border-0 p-0 py-4">
            <EmptyHeader>
              <EmptyTitle>Sin historial</EmptyTitle>
              <EmptyDescription>
                No hay cambios de estado registrados para esta cita.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
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
  if (!appointment) {
    return null
  }

  const title = appointment.customerName
  const description = `${appointment.serviceName} · ${formatTime(appointment.startsAt)}`

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-hidden p-0"
      >
        <SheetHeader className="px-5 pt-5 pb-4">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <AppointmentDetailContent appointment={appointment} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
