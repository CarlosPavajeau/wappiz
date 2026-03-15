"use client"

import { arktypeResolver } from "@hookform/resolvers/arktype"
import { useMutation } from "@tanstack/react-query"
import { type } from "arktype"
import { useRouter } from "next/navigation"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { api } from "@/lib/client-api"

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

  const form = useForm<CreateServiceFormValues>({
    defaultValues: {
      bufferMinutes: 0,
      description: "",
      durationMinutes: 30,
      name: "",
      price: 0,
    },
    resolver: arktypeResolver(createServiceSchema),
  })

  const { mutate: createService, isPending } = useMutation({
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
      router.refresh()
    },
  })

  const onSubmit = form.handleSubmit((values) => createService(values))

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset()
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>Crear servicio</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo servicio</DialogTitle>
          <DialogDescription>
            Completa los datos para registrar un nuevo servicio.
          </DialogDescription>
        </DialogHeader>

        <form id="create-service-form" onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Nombre</FieldLabel>
              <Input
                id="name"
                placeholder="Corte de cabello"
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
              <FieldLabel htmlFor="description">
                Descripción{" "}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </FieldLabel>
              <Textarea
                id="description"
                placeholder="Descripción del servicio"
                rows={3}
                aria-invalid={!!form.formState.errors.description}
                aria-describedby={
                  form.formState.errors.description
                    ? "description-error"
                    : undefined
                }
                {...form.register("description")}
              />
              <FieldError
                id="description-error"
                errors={[form.formState.errors.description]}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="durationMinutes">
                  Duración (min)
                </FieldLabel>
                <Input
                  id="durationMinutes"
                  type="number"
                  min={1}
                  placeholder="30"
                  aria-invalid={!!form.formState.errors.durationMinutes}
                  aria-describedby={
                    form.formState.errors.durationMinutes
                      ? "durationMinutes-error"
                      : undefined
                  }
                  {...form.register("durationMinutes", { valueAsNumber: true })}
                />
                <FieldError
                  id="durationMinutes-error"
                  errors={[form.formState.errors.durationMinutes]}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="bufferMinutes">
                  Buffer (min)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        aria-label="¿Qué es el buffer?"
                        className="text-muted-foreground hover:text-foreground ml-1 inline-flex cursor-default items-center"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4" />
                          <path d="M12 8h.01" />
                        </svg>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Tiempo de descanso entre citas consecutivas
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FieldLabel>
                <Input
                  id="bufferMinutes"
                  type="number"
                  min={0}
                  placeholder="0"
                  aria-invalid={!!form.formState.errors.bufferMinutes}
                  aria-describedby={
                    form.formState.errors.bufferMinutes
                      ? "bufferMinutes-error"
                      : undefined
                  }
                  {...form.register("bufferMinutes", { valueAsNumber: true })}
                />
                <FieldError
                  id="bufferMinutes-error"
                  errors={[form.formState.errors.bufferMinutes]}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="price">Precio</FieldLabel>
              <Input
                id="price"
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                aria-invalid={!!form.formState.errors.price}
                aria-describedby={
                  form.formState.errors.price ? "price-error" : undefined
                }
                {...form.register("price", { valueAsNumber: true })}
              />
              <FieldError
                id="price-error"
                errors={[form.formState.errors.price]}
              />
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter showCloseButton>
          <Button type="submit" form="create-service-form" disabled={isPending}>
            {isPending ? "Creando..." : "Crear servicio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
