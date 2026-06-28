"use client"

import { arktypeResolver } from "@hookform/resolvers/arktype"
import {
  Alert02Icon,
  ArrowDown01Icon,
  Calendar04Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ApiError } from "@wappiz/api-client"
import type { Appointment } from "@wappiz/api-client/types/appointments"
import { type } from "arktype"
import { differenceInMinutes, format, formatDuration } from "date-fns"
import { es } from "date-fns/locale"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useIsMobile } from "@/hooks/use-mobile"
import { api } from "@/lib/client-api"
import { priceFormatter } from "@/lib/intl"

import { formatTime, isTerminalStatus } from "./appointment-utils"
import { StatusActionMenu } from "./status-action-menu"
import { StatusBadge } from "./status-badge"
import { AppointmentStatusHistory } from "./status-history"

type Props = {
  appointment: Appointment
}

const rescheduleAppointmentSchema = type({
  date: type("string >= 1").configure({
    message: "Selecciona una fecha",
  }),
  time: type("string >= 1").configure({
    message: "Selecciona una hora",
  }),
})

type RescheduleAppointmentFormValues = typeof rescheduleAppointmentSchema.infer

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

type AppointmentRescheduleDialogProps = {
  appointment: Appointment
  open: boolean
  onOpenChange: (open: boolean) => void
}

function AppointmentRescheduleDialog({
  appointment,
  open,
  onOpenChange,
}: AppointmentRescheduleDialogProps) {
  const queryClient = useQueryClient()
  const { control, handleSubmit, reset } =
    useForm<RescheduleAppointmentFormValues>({
      defaultValues: rescheduleDefaultValuesFor(appointment),
      resolver: arktypeResolver(rescheduleAppointmentSchema),
    })

  const {
    error: rescheduleAppointmentError,
    isPending: isReschedulingAppointment,
    mutate: rescheduleAppointment,
    reset: resetRescheduleAppointment,
  } = useMutation({
    mutationFn: (values: RescheduleAppointmentFormValues) => {
      const startsAt = new Date(`${values.date}T${values.time}:00`)
      if (!Number.isFinite(startsAt.getTime())) {
        throw new TypeError("invalid appointment date")
      }

      return api.appointments.reschedule(appointment.id, {
        startsAt: startsAt.toISOString(),
      })
    },
    onSuccess: () => {
      toast.success("Cita reagendada correctamente")
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
      onOpenChange(false)
      reset(rescheduleDefaultValuesFor(appointment))
    },
  })

  const onSubmit = handleSubmit((values) => rescheduleAppointment(values))

  const handleOpenChange = (next: boolean) => {
    reset(rescheduleDefaultValuesFor(appointment))
    resetRescheduleAppointment()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reagendar cita</DialogTitle>
          <DialogDescription>
            Selecciona la nueva fecha para {appointment.customerName}.
          </DialogDescription>
        </DialogHeader>

        <form id="reschedule-appointment-form" onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={control}
                name="date"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Fecha</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="date"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="time"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Hora</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="time"
                      step="300"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>
          </FieldGroup>
        </form>

        {rescheduleAppointmentError !== null && (
          <Alert variant="destructive">
            <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
            <AlertTitle>No se pudo reagendar la cita</AlertTitle>
            <AlertDescription>
              {rescheduleAppointmentError instanceof ApiError
                ? rescheduleAppointmentError.message
                : "Revisa el horario e intenta de nuevo."}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter showCloseButton>
          <Button
            type="submit"
            form="reschedule-appointment-form"
            disabled={isReschedulingAppointment}
          >
            {isReschedulingAppointment && <Spinner />}
            Reagendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function rescheduleDefaultValuesFor(
  appointment: Appointment
): RescheduleAppointmentFormValues {
  const startsAt = new Date(appointment.startsAt)

  return {
    date: format(startsAt, "yyyy-MM-dd"),
    time: format(startsAt, "HH:mm"),
  }
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
  const [rescheduleOpen, setRescheduleOpen] = useState(false)

  if (!appointment) {
    return null
  }

  const isTerminal = isTerminalStatus(appointment.status)
  const canReschedule = appointment.status === "confirmed"
  const rescheduleButton = (
    <Button
      type="button"
      variant="outline"
      onClick={() => setRescheduleOpen(true)}
    >
      <HugeiconsIcon
        icon={Calendar04Icon}
        strokeWidth={2}
        data-icon="inline-start"
      />
      Reagendar
    </Button>
  )

  if (isMobile) {
    return (
      <>
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
              {canReschedule && rescheduleButton}
              {!isTerminal && (
                <StatusActionMenu appointment={appointment} stacked />
              )}
              <DrawerClose asChild>
                <Button variant="outline">Cerrar</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
        <AppointmentRescheduleDialog
          appointment={appointment}
          open={rescheduleOpen}
          onOpenChange={setRescheduleOpen}
        />
      </>
    )
  }

  return (
    <>
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
            {canReschedule && rescheduleButton}
            {!isTerminal && <StatusActionMenu appointment={appointment} />}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AppointmentRescheduleDialog
        appointment={appointment}
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
      />
    </>
  )
}
