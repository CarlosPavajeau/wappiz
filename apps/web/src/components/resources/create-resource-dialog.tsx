import { arktypeResolver } from "@hookform/resolvers/arktype"
import { ResourcesAddIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { ApiError } from "@wappiz/api-client"
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

const createResourceSchema = type({
  name: type("string >= 1").configure({
    message: "El nombre es requerido",
  }),
  type: type("string >= 1").configure({
    message: "El tipo es requerido",
  }),
})

type CreateResourceFormValues = typeof createResourceSchema.infer

export function CreateResourceDialog() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CreateResourceFormValues>({
    defaultValues: { name: "", type: "" },
    resolver: arktypeResolver(createResourceSchema),
  })

  const { mutateAsync: createResource } = useMutation({
    mutationFn: (values: CreateResourceFormValues) =>
      api.resources.create(values),
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Error al crear el recurso. Verifica los datos e intenta de nuevo."
      )
    },
    onSuccess: (resource) => {
      setOpen(false)
      navigate({
        params: {
          id: resource.id,
        },
        search: {
          setup: "working-hours",
        },
        to: "/dashboard/resources/$id",
      })
    },
  })

  const onSubmit = handleSubmit(async (values) => await createResource(values))

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset()
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <HugeiconsIcon
          icon={ResourcesAddIcon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        Agregar recurso
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo recurso</DialogTitle>
          <DialogDescription>
            Completa los datos para registrar un nuevo recurso.
          </DialogDescription>
        </DialogHeader>

        <form id="create-resource-form" onSubmit={onSubmit}>
          <FieldGroup>
            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Nombre</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="Ana García"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="type"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Tipo</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="Empleado, Sala, Equipo…"
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
            form="create-resource-form"
            disabled={isSubmitting}
          >
            {isSubmitting && <Spinner />}
            Agregar recurso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
