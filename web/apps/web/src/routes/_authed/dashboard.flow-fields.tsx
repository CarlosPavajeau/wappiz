import { arktypeResolver } from "@hookform/resolvers/arktype"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import type {
  TenantFlowField,
  UpsertTenantFlowFieldRequest,
} from "@wappiz/api-client/types/tenant-flow-fields"
import { type } from "arktype"
import { PlusIcon, PencilIcon, Rows3Icon } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/client-api"

export const Route = createFileRoute("/_authed/dashboard/flow-fields")({
  component: RouteComponent,
  loader: async () => {
    const fields = await api.tenantFlowFields.list()
    return {
      fields: [...fields].toSorted(
        (left, right) => left.sortOrder - right.sortOrder
      ),
    }
  },
  pendingComponent: PendingComponent,
})

const flowFieldSchema = type({
  isRequired: "boolean",
  question: type("string >= 2").configure({
    message: "La pregunta debe tener al menos 2 caracteres",
  }),
  sortOrder: type("number.integer >= 0").configure({
    message: "El orden debe ser un numero entero de 0 o mayor",
  }),
})

type FlowFieldFormValues = typeof flowFieldSchema.infer

type FlowFieldDialogProps = {
  field?: TenantFlowField
}

function defaultValuesFor(
  field: TenantFlowField | undefined
): FlowFieldFormValues {
  return {
    isRequired: field?.isRequired ?? false,
    question: field?.question ?? "",
    sortOrder: field?.sortOrder ?? 0,
  }
}

function toRequest(values: FlowFieldFormValues): UpsertTenantFlowFieldRequest {
  return {
    isRequired: values.isRequired,
    question: values.question.trim(),
    sortOrder: values.sortOrder,
  }
}

function FlowFieldDialog({ field }: FlowFieldDialogProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const isEdit = field !== undefined
  const formId = isEdit ? `update-flow-field-${field.id}` : "create-flow-field"

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FlowFieldFormValues>({
    defaultValues: defaultValuesFor(field),
    resolver: arktypeResolver(flowFieldSchema),
  })

  const { mutateAsync: saveField } = useMutation({
    mutationFn: (values: FlowFieldFormValues) => {
      const request = toRequest(values)
      if (field === undefined) {
        return api.tenantFlowFields.create(request)
      }
      return api.tenantFlowFields.update(field.id, request)
    },
    onError: () => {
      toast.error(
        "No se pudo guardar el campo. Revisa los datos e intenta de nuevo."
      )
    },
    onSuccess: () => {
      setOpen(false)
      reset(defaultValuesFor(field))
      toast.success(isEdit ? "Campo actualizado" : "Campo creado")
      router.invalidate()
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const question = values.question.trim()
    if (question.length < 2) {
      toast.error("La pregunta debe tener al menos 2 caracteres.")
      return
    }
    await saveField({ ...values, question })
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset(defaultValuesFor(field))
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            size={isEdit ? "icon-sm" : "default"}
            variant={isEdit ? "ghost" : "default"}
          />
        }
      >
        {isEdit ? (
          <>
            <PencilIcon aria-hidden="true" />
            <span className="sr-only">Editar campo</span>
          </>
        ) : (
          <>
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            Nuevo campo
          </>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar campo" : "Nuevo campo"}</DialogTitle>
          <DialogDescription>
            Define la pregunta que el bot usara durante el flujo de reserva.
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={onSubmit}>
          <FieldGroup>
            <Controller
              control={control}
              name="question"
              render={({ field: formField, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={formField.name}>Pregunta</FieldLabel>
                  <Textarea
                    {...formField}
                    id={formField.name}
                    placeholder="Cual es tu correo electronico?"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={control}
                name="sortOrder"
                render={({ field: formField, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={formField.name}>Orden</FieldLabel>
                    <Input
                      {...formField}
                      id={formField.name}
                      type="number"
                      min={0}
                      aria-invalid={fieldState.invalid}
                      onChange={(event) => {
                        const {value} = event.target
                        formField.onChange(value === "" ? "" : Number(value))
                      }}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="isRequired"
                render={({ field: formField, fieldState }) => (
                  <Field
                    orientation="horizontal"
                    className="w-fit self-end"
                    data-invalid={fieldState.invalid}
                  >
                    <FieldLabel htmlFor={formField.name}>
                      Obligatorio
                    </FieldLabel>
                    <Switch
                      id={formField.name}
                      name={formField.name}
                      aria-invalid={fieldState.invalid}
                      checked={formField.value}
                      onCheckedChange={formField.onChange}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>
          </FieldGroup>
        </form>

        <DialogFooter showCloseButton>
          <Button type="submit" form={formId} disabled={isSubmitting}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FlowFieldEnabledSwitch({ field }: { field: TenantFlowField }) {
  const router = useRouter()
  const { mutate: toggleField, isPending } = useMutation({
    mutationFn: () => api.tenantFlowFields.toggle(field.id),
    onError: () => {
      toast.error("No se pudo cambiar el estado del campo.")
    },
    onSuccess: () => {
      router.invalidate()
    },
  })

  return (
    <Switch
      checked={field.isEnabled}
      disabled={isPending}
      aria-label={field.isEnabled ? "Desactivar campo" : "Activar campo"}
      onCheckedChange={() => toggleField()}
    />
  )
}

function FlowFieldsTable({ fields }: { fields: TenantFlowField[] }) {
  return (
    <Table>
      <TableCaption className="sr-only">
        Campos del flujo de WhatsApp
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Pregunta</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Orden</TableHead>
          <TableHead>Obligatorio</TableHead>
          <TableHead>Activo</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {fields.map((field) => (
          <TableRow key={field.id}>
            <TableCell>
              <div className="flex min-w-0 flex-col">
                <span className="font-medium">
                  {field.question || field.fieldKey}
                </span>
                <span className="text-xs text-muted-foreground">
                  {field.fieldKey}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <Badge
                variant={field.fieldType === "custom" ? "default" : "secondary"}
              >
                {field.fieldType === "custom" ? "Personalizado" : "Predefinido"}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground tabular-nums">
              {field.sortOrder}
            </TableCell>
            <TableCell>{field.isRequired ? "Si" : "No"}</TableCell>
            <TableCell>
              <FlowFieldEnabledSwitch field={field} />
            </TableCell>
            <TableCell>
              <FlowFieldDialog field={field} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function RouteComponent() {
  const { fields } = Route.useLoaderData()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-4 sm:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Campos del flujo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configura los datos que el bot puede pedir antes de confirmar una
            cita.
          </p>
        </div>
        <FlowFieldDialog />
      </div>

      {fields.length === 0 ? (
        <Empty className="border py-20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Rows3Icon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Sin campos</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <EmptyDescription>
              Crea un campo para personalizar los datos que captura el flujo.
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      ) : (
        <FlowFieldsTable fields={fields} />
      )}
    </div>
  )
}

function PendingComponent() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-4 sm:items-center">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
