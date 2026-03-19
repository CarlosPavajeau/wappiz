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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/client-api"
import { cn } from "@/lib/utils"

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
  fullWidth,
  asTextLink,
}: {
  appointment: Appointment
  fullWidth?: boolean
  asTextLink?: boolean
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

  const handleMenuAction = (status: AppointmentStatus) => {
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

  const isDestructive = (status: AppointmentStatus) =>
    status === "cancelled" || status === "no_show"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            asTextLink ? (
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                type="button"
              >
                {isPending ? (
                  <>
                    <Spinner className="size-3" />
                    Actualizando…
                  </>
                ) : (
                  <>
                    Cambiar estado
                    <span aria-hidden>›</span>
                  </>
                )}
              </Button>
            ) : (
              <Button
                className={cn(fullWidth && "w-full justify-between")}
                disabled={isPending}
                size="sm"
                variant="outline"
              >
                {isPending ? (
                  <>
                    <Spinner />
                    Actualizando…
                  </>
                ) : (
                  <>
                    Cambiar estado
                    <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
                  </>
                )}
              </Button>
            )
          }
        />
        <DropdownMenuContent align="end">
          {transitions.map((status) => {
            const config = getStatusConfig(status)
            return (
              <DropdownMenuItem
                key={status}
                variant={isDestructive(status) ? "destructive" : "default"}
                onClick={() => handleMenuAction(status)}
              >
                <HugeiconsIcon icon={config.icon} strokeWidth={2} />
                {config.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
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
