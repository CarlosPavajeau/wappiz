import { arktypeResolver } from "@hookform/resolvers/arktype"
import { Edit01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
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

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<UpdateResourceFormValues>({
    defaultValues,
    resolver: arktypeResolver(updateResourceSchema),
  })

  const { mutateAsync: updateResource } = useMutation({
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

  const onSubmit = handleSubmit(async (values) => await updateResource(values))

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset(defaultValues)
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

            <Controller
              control={control}
              name="avatarURL"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>URL de avatar</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="https://ejemplo.com/foto.png"
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
            form="update-resource-form"
            disabled={isSubmitting}
          >
            {isSubmitting && <Spinner />}
            Actualizar recurso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
