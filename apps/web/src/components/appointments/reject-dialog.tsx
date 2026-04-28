import { arktypeResolver } from "@hookform/resolvers/arktype"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { PendingActivationsResponse } from "@wappiz/api-client/types/admin"
import { type } from "arktype"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/client-api"

const rejectSchema = type({
  reason: type("string >= 1").configure({
    message: "El motivo de rechazo es requerido",
  }),
})

type RejectFormValues = typeof rejectSchema.infer

type Props = {
  request: PendingActivationsResponse
}

export function RejectDialog({ request }: Props) {
  const [open, setOpen] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<RejectFormValues>({
    defaultValues: { reason: "" },
    resolver: arktypeResolver(rejectSchema),
  })

  const queryClient = useQueryClient()
  const { mutateAsync: reject } = useMutation({
    mutationFn: (values: RejectFormValues) =>
      api.admin.reject(request.tenantId, values),
    onError: () => {
      toast.error("Error al rechazar la solicitud. Intenta de nuevo.")
    },
    onSuccess: () => {
      setOpen(false)
      toast.success(`Solicitud de ${request.tenantName} rechazada`)
      queryClient.invalidateQueries({ queryKey: ["pending-activations"] })
    },
  })

  const onSubmit = handleSubmit(async (values) => await reject(values))

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset()
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="destructive" />}>
        Rechazar
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rechazar {request.tenantName}</DialogTitle>
          <DialogDescription>
            Indica el motivo por el cual se rechaza esta solicitud de
            activación. El equipo será notificado.
          </DialogDescription>
        </DialogHeader>

        <form id="reject-form" onSubmit={onSubmit}>
          <FieldGroup>
            <Controller
              control={control}
              name="reason"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Motivo de rechazo
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id={field.name}
                    placeholder="Ej: Información incompleta o incorrecta..."
                    rows={4}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        <DialogFooter showCloseButton>
          <Button
            type="submit"
            form="reject-form"
            variant="destructive"
            disabled={isSubmitting}
          >
            {isSubmitting && <Spinner />}
            Rechazar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
