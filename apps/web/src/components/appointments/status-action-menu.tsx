"use client"

import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
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
import { ButtonGroup } from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/client-api"

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

export function StatusActionMenu({
  appointment,
}: {
  appointment: Appointment
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
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
      setDialogOpen(false)
      setPendingStatus(null)
      setReason("")
      setCancelledBy("customer")
    },
  })

  if (transitions.length === 0) {
    return null
  }

  const [primaryStatus, ...overflowStatuses] = transitions
  const primaryConfig = getStatusConfig(primaryStatus)
  const hasOverflow = overflowStatuses.length > 0

  const isDestructive = (status: AppointmentStatus) =>
    status === "cancelled" || status === "no_show"

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
    if (pendingStatus) mutate(pendingStatus)
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setDialogOpen(false)
      setPendingStatus(null)
      setReason("")
      setCancelledBy("customer")
    }
  }

  return (
    <>
      <ButtonGroup>
        <Button
          disabled={isPending}
          onClick={() => triggerAction(primaryStatus)}
          type="button"
          variant="outline"
        >
          {isPending ? (
            <>
              <Spinner className="shrink-0" />
              Actualizando…
            </>
          ) : (
            <>Cambiar a {primaryConfig.label}</>
          )}
        </Button>

        {hasOverflow && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    aria-label="Más opciones de estado"
                    disabled={isPending}
                    type="button"
                    className="pl-2!"
                    variant="outline"
                  >
                    <HugeiconsIcon
                      icon={ArrowDown01Icon}
                      size={14}
                      strokeWidth={2}
                    />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-44">
                {overflowStatuses.map((status) => {
                  const config = getStatusConfig(status)
                  return (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => triggerAction(status)}
                      variant={
                        isDestructive(status) ? "destructive" : "default"
                      }
                    >
                      <HugeiconsIcon
                        icon={config.icon}
                        size={16}
                        strokeWidth={2}
                      />
                      {config.label}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </ButtonGroup>

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
                  <fieldset className="flex flex-col gap-1.5">
                    <legend className="text-sm font-medium">
                      Cancelado por
                    </legend>
                    <div className="flex flex-col gap-1.5">
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          checked={cancelledBy === "customer"}
                          className="accent-primary"
                          name="cancelled_by"
                          onChange={() => setCancelledBy("customer")}
                          type="radio"
                          value="customer"
                        />
                        Cliente
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          checked={cancelledBy === "business"}
                          className="accent-primary"
                          name="cancelled_by"
                          onChange={() => setCancelledBy("business")}
                          type="radio"
                          value="business"
                        />
                        Negocio
                      </label>
                    </div>
                  </fieldset>
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
