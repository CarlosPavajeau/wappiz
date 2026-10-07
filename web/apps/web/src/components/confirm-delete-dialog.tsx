import { Alert02Icon, Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "@tanstack/react-query"
import { ApiError } from "@wappiz/api-client"
import { ERROR_CODES } from "@wappiz/api-client/error-codes"
import { useState } from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

type Entity = "recurso" | "servicio"

const DELETED_MESSAGE: Record<Entity, string> = {
  recurso: "Recurso eliminado",
  servicio: "Servicio eliminado",
}

type Props = {
  entity: Entity
  name: string
  onDelete: () => Promise<unknown>
  onDeleted: () => Promise<void>
}

/**
 * The API refuses to delete a resource or service that upcoming
 * appointments still need. That refusal is expected, not a failure, so it
 * replaces the confirmation with the API's explanation instead of a toast.
 */
function blockedReason(error: Error | null): string | undefined {
  if (
    error instanceof ApiError &&
    error.code === ERROR_CODES.hasUpcomingAppointments
  ) {
    return error.message
  }
  return undefined
}

export function ConfirmDeleteDialog({
  entity,
  name,
  onDelete,
  onDeleted,
}: Props) {
  const [open, setOpen] = useState(false)

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: onDelete,
    onError: (err) => {
      if (blockedReason(err) === undefined) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : `Error al eliminar el ${entity}. Intenta de nuevo.`
        )
      }
    },
    onSuccess: async () => {
      setOpen(false)
      toast.success(DELETED_MESSAGE[entity])
      await onDeleted()
    },
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset()
    }
    setOpen(next)
  }

  const blocked = blockedReason(error)

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Eliminar ${entity} ${name}`}
            className="text-muted-foreground hover:text-destructive"
          />
        }
      >
        <HugeiconsIcon
          icon={Delete02Icon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        Eliminar
      </AlertDialogTrigger>

      <AlertDialogContent>
        {blocked === undefined ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar {name}?</AlertDialogTitle>
              <AlertDialogDescription>
                El {entity} dejará de estar disponible para nuevas citas. Las
                citas pasadas se conservan en el historial.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={isPending}
                onClick={() => mutate()}
              >
                {isPending ? <Spinner /> : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
              </AlertDialogMedia>
              <AlertDialogTitle>No se puede eliminar {name}</AlertDialogTitle>
              <AlertDialogDescription>
                {blocked} Si no quieres que reciba nuevas citas mientras tanto,
                desactívalo desde Editar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Entendido</AlertDialogCancel>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
