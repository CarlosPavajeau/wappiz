"use client"

import { arktypeResolver } from "@hookform/resolvers/arktype"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import type { Service } from "@wappiz/api-client/types/services"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { api } from "@/lib/client-api"

const updateServiceSchema = type({
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

type UpdateServiceFormValues = typeof updateServiceSchema.infer

export function UpdateServiceDialog({ service }: { service: Service }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const form = useForm<UpdateServiceFormValues>({
    defaultValues: {
      bufferMinutes: service.bufferMinutes,
      description: service.description ?? "",
      durationMinutes: service.durationMinutes,
      name: service.name,
      price: service.price,
    },
    resolver: arktypeResolver(updateServiceSchema),
  })

  const { mutate: updateService, isPending } = useMutation({
    mutationFn: (values: UpdateServiceFormValues) =>
      api.services.update(service.id, values),
    onError: () => {
      toast.error(
        "Error al actualizar el servicio. Verifica los datos e intenta de nuevo."
      )
    },
    onSuccess: () => {
      setOpen(false)
      toast.success("Servicio actualizado correctamente")
      router.invalidate()
    },
  })

  const onSubmit = form.handleSubmit((values) => updateService(values))

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset()
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" aria-label="Editar servicio" />
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
          <path d="m15 5 4 4" />
        </svg>
        Editar
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar servicio</DialogTitle>
          <DialogDescription>
            Modifica los datos del servicio y guarda los cambios.
          </DialogDescription>
        </DialogHeader>

        <form id="update-service-form" onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="update-name">Nombre</FieldLabel>
              <Input
                id="update-name"
                placeholder="Corte de cabello"
                aria-invalid={!!form.formState.errors.name}
                aria-describedby={
                  form.formState.errors.name ? "update-name-error" : undefined
                }
                {...form.register("name")}
              />
              <FieldError
                id="update-name-error"
                errors={[form.formState.errors.name]}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="update-description">
                Descripción{" "}
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </FieldLabel>
              <Textarea
                id="update-description"
                placeholder="Descripción del servicio"
                rows={3}
                aria-invalid={!!form.formState.errors.description}
                aria-describedby={
                  form.formState.errors.description
                    ? "update-description-error"
                    : undefined
                }
                {...form.register("description")}
              />
              <FieldError
                id="update-description-error"
                errors={[form.formState.errors.description]}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="update-durationMinutes">
                  Duración (min)
                </FieldLabel>
                <Input
                  id="update-durationMinutes"
                  type="number"
                  min={1}
                  placeholder="30"
                  aria-invalid={!!form.formState.errors.durationMinutes}
                  aria-describedby={
                    form.formState.errors.durationMinutes
                      ? "update-durationMinutes-error"
                      : undefined
                  }
                  {...form.register("durationMinutes", { valueAsNumber: true })}
                />
                <FieldError
                  id="update-durationMinutes-error"
                  errors={[form.formState.errors.durationMinutes]}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="update-bufferMinutes">
                  Buffer (min)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        aria-label="¿Qué es el buffer?"
                        className="ml-1 inline-flex cursor-default items-center text-muted-foreground hover:text-foreground"
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
                  id="update-bufferMinutes"
                  type="number"
                  min={0}
                  placeholder="0"
                  aria-invalid={!!form.formState.errors.bufferMinutes}
                  aria-describedby={
                    form.formState.errors.bufferMinutes
                      ? "update-bufferMinutes-error"
                      : undefined
                  }
                  {...form.register("bufferMinutes", { valueAsNumber: true })}
                />
                <FieldError
                  id="update-bufferMinutes-error"
                  errors={[form.formState.errors.bufferMinutes]}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="update-price">Precio</FieldLabel>
              <Input
                id="update-price"
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                aria-invalid={!!form.formState.errors.price}
                aria-describedby={
                  form.formState.errors.price ? "update-price-error" : undefined
                }
                {...form.register("price", { valueAsNumber: true })}
              />
              <FieldError
                id="update-price-error"
                errors={[form.formState.errors.price]}
              />
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter showCloseButton>
          <Button type="submit" form="update-service-form" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
