"use client"

import { MoreHorizontalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  Appointment,
  AppointmentStatus,
  CancelledBy,
} from "@wappiz/api-client/types/appointments"
import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/client-api"

import { Field, FieldLabel, FieldLegend, FieldSet } from "../ui/field"
import { RadioGroup, RadioGroupItem } from "../ui/radio-group"
import {
  getAvailableTransitions,
  getStatusConfig,
  requiresConfirmation,
  requiresReason,
} from "./appointment-utils"

const DIALOG_TITLES: Partial<Record<AppointmentStatus, string>> = {
  cancelled: "¿Cancelar esta cita?",
  completed: "¿Marcar como completada?",
  no_show: "¿Marcar como no se presentó?",
}

const DIALOG_DESCRIPTIONS: Partial<Record<AppointmentStatus, string>> = {
  cancelled:
    "Esta acción cancelará la cita de forma permanente y no se podrá deshacer.",
  completed:
    "Esta acción marcará la cita como completada y no se podrá deshacer.",
  no_show:
    "Esta acción marcará al cliente como no presentado y no se podrá deshacer.",
}

const isDestructive = (status: AppointmentStatus) => status === "cancelled"

export function StatusActionMenu({
  appointment,
  stacked = false,
}: {
  appointment: Appointment
  stacked?: boolean
}) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<AppointmentStatus | null>(
    null
  )
  const [reason, setReason] = useState("")
  const [cancelledBy, setCancelledBy] = useState<CancelledBy>("customer")

  const transitions = getAvailableTransitions(appointment.status)

  const { mutate, isPending } = useMutation({
    mutationFn: (status: AppointmentStatus) =>
      api.appointments.updateStatus(appointment.id, {
        status,
        ...(requiresReason(status) && reason ? { reason } : {}),
        ...(status === "cancelled" ? { cancelled_by: cancelledBy } : {}),
      }),
    onSuccess: () => {
      setDialogOpen(false)
      setPendingStatus(null)
      setReason("")
      setCancelledBy("customer")
      queryClient.refetchQueries({ queryKey: ["appointments"] })
    },
  })

  if (transitions.length === 0) {
    return null
  }

  const [primaryStatus, ...overflowStatuses] = transitions

  const triggerAction = (status: AppointmentStatus) => {
    if (requiresConfirmation(status)) {
      setPendingStatus(status)
      setReason("")
      setCancelledBy("customer")
      setDialogOpen(true)
    } else {
      mutate(status)
    }
  }

  const handleConfirm = () => {
    if (pendingStatus) {
      mutate(pendingStatus)
    }
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setDialogOpen(false)
      setPendingStatus(null)
      setReason("")
      setCancelledBy("customer")
    }
  }

  const primaryButton = primaryStatus && (
    <Button
      disabled={isPending}
      onClick={() => triggerAction(primaryStatus)}
      type="button"
    >
      {isPending && <Spinner data-icon="inline-start" />}
      Cambiar a {getStatusConfig(primaryStatus).label}
    </Button>
  )

  const overflowMenu = overflowStatuses.length > 0 && (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline">
            <HugeiconsIcon
              icon={MoreHorizontalIcon}
              size={16}
              strokeWidth={2}
              aria-hidden="true"
            />
            Más acciones
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {overflowStatuses.map((status) => {
          const { icon, label } = getStatusConfig(status)

          return (
            <DropdownMenuItem
              key={status}
              disabled={isPending}
              onClick={() => triggerAction(status)}
              variant={isDestructive(status) ? "destructive" : "default"}
            >
              <HugeiconsIcon
                icon={icon}
                size={14}
                strokeWidth={2}
                aria-hidden="true"
              />
              Cambiar a {label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <>
      {stacked ? (
        <>
          {primaryButton}
          {overflowMenu}
        </>
      ) : (
        <>
          {overflowMenu}
          {primaryButton}
        </>
      )}

      <AlertDialog onOpenChange={handleDialogOpenChange} open={dialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatus ? DIALOG_TITLES[pendingStatus] : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatus ? DIALOG_DESCRIPTIONS[pendingStatus] : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pendingStatus &&
            (requiresReason(pendingStatus) ||
              pendingStatus === "cancelled") && (
              <div className="flex flex-col gap-3">
                {pendingStatus === "cancelled" && (
                  <FieldSet>
                    <FieldLegend variant="label">Cancelado por</FieldLegend>

                    <RadioGroup
                      defaultValue={cancelledBy}
                      onValueChange={setCancelledBy}
                    >
                      <Field orientation="horizontal">
                        <RadioGroupItem
                          value="customer"
                          id="cancel-by-customer"
                        />
                        <FieldLabel
                          htmlFor="cancel-by-customer"
                          className="font-normal"
                        >
                          Cliente
                        </FieldLabel>
                      </Field>
                      <Field orientation="horizontal">
                        <RadioGroupItem
                          value="business"
                          id="cancel-by-business"
                        />
                        <FieldLabel
                          htmlFor="cancel-by-business"
                          className="font-normal"
                        >
                          Negocio
                        </FieldLabel>
                      </Field>
                    </RadioGroup>
                  </FieldSet>
                )}
                {requiresReason(pendingStatus) && (
                  <Textarea
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Motivo (opcional)"
                    rows={3}
                    value={reason}
                  />
                )}
              </div>
            )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={handleConfirm}
              variant={
                pendingStatus && isDestructive(pendingStatus)
                  ? "destructive"
                  : "default"
              }
            >
              {isPending ? <Spinner /> : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
