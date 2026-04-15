import { Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
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
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/client-api"

type Props = {
  resourceId: string
  overrideId: string
}

export function DeleteOverrideButton({ resourceId, overrideId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const { mutate: deleteOverride, isPending } = useMutation({
    mutationFn: () => api.resources.deleteOverride({ overrideId, resourceId }),
    onError: () => {
      toast.error("Error al eliminar la excepción. Intenta de nuevo.")
    },
    onSuccess: () => {
      setOpen(false)
      toast.success("Excepción eliminada")
      router.invalidate()
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        disabled={isPending}
        aria-label="Eliminar excepción"
        className="shrink-0 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
      >
        <HugeiconsIcon icon={Delete02Icon} size={14} />
      </AlertDialogTrigger>

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar excepción?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={() => deleteOverride()}
          >
            {isPending ? <Spinner /> : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
