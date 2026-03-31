import { arktypeResolver } from "@hookform/resolvers/arktype"
import { Edit01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
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
import { useIsMobile } from "@/hooks/use-mobile"
import { api } from "@/lib/client-api"

const updateResourceSchema = type({
  "avatarURL?": "string",
  name: type("string >= 1").configure({
    message: "El nombre es requerido",
  }),
  type: type("string >= 1").configure({
    message: "El tipo es requerido",
  }),
})

type UpdateResourceFormValues = typeof updateResourceSchema.infer

type Props = {
  resourceId: string
  defaultValues: UpdateResourceFormValues
}

export function UpdateResourceDialog({ resourceId, defaultValues }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const isMobile = useIsMobile()

  const form = useForm<UpdateResourceFormValues>({
    defaultValues,
    resolver: arktypeResolver(updateResourceSchema),
  })

  const { mutate: updateResource, isPending } = useMutation({
    mutationFn: (values: UpdateResourceFormValues) =>
      api.resources.update(resourceId, values),
    onError: () => {
      toast.error(
        "Error al actualizar el recurso. Verifica los datos e intenta de nuevo."
      )
    },
    onSuccess: () => {
      setOpen(false)
      router.invalidate()
    },
  })

  const onSubmit = form.handleSubmit((values) => updateResource(values))

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset(defaultValues)
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size={isMobile ? "icon" : "default"}
            aria-label="Editar recurso"
          />
        }
      >
        <HugeiconsIcon icon={Edit01Icon} size={16} strokeWidth={2} />
        {!isMobile && <span>Editar recurso</span>}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar recurso</DialogTitle>
          <DialogDescription>
            Actualiza los datos del recurso.
          </DialogDescription>
        </DialogHeader>

        <form id="update-resource-form" onSubmit={onSubmit} noValidate>
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

            <Field>
              <FieldLabel htmlFor="avatarURL">URL de avatar</FieldLabel>
              <Input
                id="avatarURL"
                placeholder="https://ejemplo.com/foto.png"
                {...form.register("avatarURL")}
              />
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter showCloseButton>
          <Button
            type="submit"
            form="update-resource-form"
            disabled={isPending}
          >
            {isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
