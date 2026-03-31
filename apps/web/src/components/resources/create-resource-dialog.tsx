import { arktypeResolver } from "@hookform/resolvers/arktype"
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { type } from "arktype"
import { useState } from "react"
import { useForm } from "react-hook-form"
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

  const form = useForm<CreateResourceFormValues>({
    defaultValues: { name: "", type: "" },
    resolver: arktypeResolver(createResourceSchema),
  })

  const { mutate: createResource, isPending } = useMutation({
    mutationFn: (values: CreateResourceFormValues) =>
      api.resources.create(values),
    onError: () => {
      toast.error(
        "Error al crear el recurso. Verifica los datos e intenta de nuevo."
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

  const onSubmit = form.handleSubmit((values) => createResource(values))

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset()
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>Crear recurso</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo recurso</DialogTitle>
          <DialogDescription>
            Completa los datos para registrar un nuevo recurso.
          </DialogDescription>
        </DialogHeader>

        <form id="create-resource-form" onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Nombre</FieldLabel>
              <Input
                id="name"
                placeholder="Ana García"
                aria-invalid={!!form.formState.errors.name}
                aria-describedby={
                  form.formState.errors.name ? "name-error" : undefined
                }
                {...form.register("name")}
              />
              <FieldError
                id="name-error"
                errors={[form.formState.errors.name]}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="type">Tipo</FieldLabel>
              <Input
                id="type"
                placeholder="Empleado, Sala, Equipo…"
                aria-invalid={!!form.formState.errors.type}
                aria-describedby={
                  form.formState.errors.type ? "type-error" : undefined
                }
                {...form.register("type")}
              />
              <FieldError
                id="type-error"
                errors={[form.formState.errors.type]}
              />
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter showCloseButton>
          <Button
            type="submit"
            form="create-resource-form"
            disabled={isPending}
          >
            {isPending ? "Creando..." : "Crear recurso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
