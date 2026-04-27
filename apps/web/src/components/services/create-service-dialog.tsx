import { arktypeResolver } from "@hookform/resolvers/arktype"
import { InformationCircleIcon, ServiceIcon } from "@hugeicons/core-free-icons"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { api } from "@/lib/client-api"

import { Spinner } from "../ui/spinner"

const createServiceSchema = type({
  bufferMinutes: type("number >= 0").configure({
    message: "El buffer debe ser 0 o mayor",
  }),
  "description?": "string",
  durationMinutes: type("number > 0").configure({
    message: "La duración debe ser mayor a 0",
  }),
  name: type("string >= 1").configure({
    message: "El nombre es requerido",
  }),
  price: type("number >= 0").configure({
    message: "El precio debe ser 0 o mayor",
  }),
})

type CreateServiceFormValues = typeof createServiceSchema.infer

export function CreateServiceDialog() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CreateServiceFormValues>({
    defaultValues: {
      bufferMinutes: 0,
      description: "",
      durationMinutes: 30,
      name: "",
      price: 0,
    },
    resolver: arktypeResolver(createServiceSchema),
  })

  const { mutateAsync: createService } = useMutation({
    mutationFn: (values: CreateServiceFormValues) =>
      api.services.create(values),
    onError: () => {
      toast.error(
        "Error al crear el servicio. Verifica los datos e intenta de nuevo."
      )
    },
    onSuccess: () => {
      setOpen(false)
      toast.success("Servicio creado correctamente")
      router.invalidate()
    },
  })

  const onSubmit = handleSubmit(async (values) => await createService(values))

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
          icon={ServiceIcon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        Agregar servicio
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo servicio</DialogTitle>
          <DialogDescription>
            Completa los datos para registrar un nuevo servicio.
          </DialogDescription>
        </DialogHeader>

        <form id="create-service-form" onSubmit={onSubmit}>
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
                    placeholder="Corte de cabello"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="description"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Descripción{" "}
                    <span className="font-normal text-muted-foreground">
                      (opcional)
                    </span>
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={control}
                name="durationMinutes"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Duración (min)</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="number"
                      min={1}
                      placeholder="30"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="bufferMinutes"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Buffer (min)
                      <Tooltip>
                        <TooltipTrigger
                          aria-label="¿Qué es el buffer?"
                          className="ml-1 inline-flex cursor-default items-center text-muted-foreground hover:text-foreground"
                        >
                          <HugeiconsIcon
                            icon={InformationCircleIcon}
                            strokeWidth={2}
                            size={13}
                            className="size-3.25"
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Tiempo de descanso entre citas consecutivas
                        </TooltipContent>
                      </Tooltip>
                    </FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="number"
                      min={0}
                      placeholder="0"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>

            <Controller
              control={control}
              name="price"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Precio</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    aria-invalid={fieldState.invalid}
                    onChange={(e) => {
                      const val = e.target.value
                      field.onChange(val === "" ? "" : Number(val))
                    }}
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
            form="create-service-form"
            disabled={isSubmitting}
          >
            {isSubmitting && <Spinner />}
            Agregar servicio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
