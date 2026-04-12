import { arktypeResolver } from "@hookform/resolvers/arktype"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import type { PendingActivationsResponse } from "@wappiz/api-client/types/admin"
import { type } from "arktype"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

export function PendingActivationCard({ request }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const form = useForm<ActivateFormValues>({
    defaultValues: {
      accessToken: "",
      displayPhoneNumber: "",
      phoneNumberId: "",
      wabaId: "",
    },
    resolver: arktypeResolver(activateSchema),
  })

  const { mutate: activate, isPending } = useMutation({
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
      router.invalidate()
    },
  })

  const onSubmit = form.handleSubmit((values) => activate(values))

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset()
    }
    setOpen(next)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{request.tenantName}</CardTitle>
      </CardHeader>

      <CardContent>
        <p>
          <strong>Email:</strong> {request.contactEmail}
        </p>

        {request.notes && (
          <p>
            <strong>Notas:</strong> {request.notes}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button />}>Activar</DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Activar {request.tenantName}</DialogTitle>
              <DialogDescription>
                Completa los datos de WhatsApp Business para activar esta
                cuenta.
              </DialogDescription>
            </DialogHeader>

            <form id="activate-form" onSubmit={onSubmit} noValidate>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="phoneNumberId">
                    Phone Number ID
                  </FieldLabel>
                  <Input
                    id="phoneNumberId"
                    placeholder="123456789"
                    aria-invalid={!!form.formState.errors.phoneNumberId}
                    aria-describedby={
                      form.formState.errors.phoneNumberId
                        ? "phoneNumberId-error"
                        : undefined
                    }
                    {...form.register("phoneNumberId")}
                  />
                  <FieldError
                    id="phoneNumberId-error"
                    errors={[form.formState.errors.phoneNumberId]}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="displayPhoneNumber">
                    Número de teléfono
                  </FieldLabel>
                  <Input
                    id="displayPhoneNumber"
                    placeholder="+1 555 000 0000"
                    aria-invalid={!!form.formState.errors.displayPhoneNumber}
                    aria-describedby={
                      form.formState.errors.displayPhoneNumber
                        ? "displayPhoneNumber-error"
                        : undefined
                    }
                    {...form.register("displayPhoneNumber")}
                  />
                  <FieldError
                    id="displayPhoneNumber-error"
                    errors={[form.formState.errors.displayPhoneNumber]}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="wabaId">WABA ID</FieldLabel>
                  <Input
                    id="wabaId"
                    placeholder="987654321"
                    aria-invalid={!!form.formState.errors.wabaId}
                    aria-describedby={
                      form.formState.errors.wabaId ? "wabaId-error" : undefined
                    }
                    {...form.register("wabaId")}
                  />
                  <FieldError
                    id="wabaId-error"
                    errors={[form.formState.errors.wabaId]}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="accessToken">Access Token</FieldLabel>
                  <Input
                    id="accessToken"
                    type="password"
                    placeholder="EAABsbCS..."
                    aria-invalid={!!form.formState.errors.accessToken}
                    aria-describedby={
                      form.formState.errors.accessToken
                        ? "accessToken-error"
                        : undefined
                    }
                    {...form.register("accessToken")}
                  />
                  <FieldError
                    id="accessToken-error"
                    errors={[form.formState.errors.accessToken]}
                  />
                </Field>
              </FieldGroup>
            </form>

            <DialogFooter showCloseButton>
              <Button type="submit" form="activate-form" disabled={isPending}>
                {isPending ? "Activando..." : "Activar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="destructive">Rechazar</Button>
      </CardFooter>
    </Card>
  )
}
