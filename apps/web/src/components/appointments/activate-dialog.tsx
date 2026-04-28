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
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/client-api"

const activateSchema = type({
  accessToken: type("string >= 1").configure({
    message: "El Access Token es requerido",
  }),
  displayPhoneNumber: type("string >= 1").configure({
    message: "El número de teléfono es requerido",
  }),
  phoneNumberId: type("string >= 1").configure({
    message: "El Phone Number ID es requerido",
  }),
  wabaId: type("string >= 1").configure({
    message: "El WABA ID es requerido",
  }),
})

type ActivateFormValues = typeof activateSchema.infer

type Props = {
  request: PendingActivationsResponse
}

export function ActivateDialog({ request }: Props) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ActivateFormValues>({
    defaultValues: {
      accessToken: "",
      displayPhoneNumber: "",
      phoneNumberId: "",
      wabaId: "",
    },
    resolver: arktypeResolver(activateSchema),
  })

  const { mutateAsync: activate } = useMutation({
    mutationFn: (values: ActivateFormValues) =>
      api.admin.activate(request.tenantId, values),
    onError: () => {
      toast.error(
        "Error al activar el tenant. Verifica los datos e intenta de nuevo."
      )
    },
    onSuccess: () => {
      setOpen(false)
      toast.success(`${request.tenantName} activado correctamente`)
      queryClient.invalidateQueries({ queryKey: ["pending-activations"] })
    },
  })

  const onSubmit = handleSubmit(async (values) => await activate(values))

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset()
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>Activar</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Activar {request.tenantName}</DialogTitle>
          <DialogDescription>
            Completa los datos de WhatsApp Business para activar esta cuenta.
          </DialogDescription>
        </DialogHeader>

        <form id="activate-form" onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Controller
              control={control}
              name="phoneNumberId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Phone Number ID</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="123456789"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="displayPhoneNumber"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Número de teléfono
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="+1 555 000 0000"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="wabaId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>WABA ID</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="987654321"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="accessToken"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Access Token</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="EAABsbCS..."
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        <DialogFooter showCloseButton>
          <Button type="submit" form="activate-form" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            Activar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
