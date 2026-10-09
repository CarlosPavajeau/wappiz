import { ListSettingIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import type { TenantFlowField } from "@wappiz/api-client/types/tenant-flow-fields"
import { toast } from "sonner"

import { describeRule } from "@/components/flow-fields/flow-field-rules"
import { FlowFieldSheet } from "@/components/flow-fields/flow-field-sheet"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
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
          <TableHead>Respuesta</TableHead>
          <TableHead>Orden</TableHead>
          <TableHead>Obligatorio</TableHead>
          <TableHead>Frecuencia</TableHead>
          <TableHead>Activo</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {fields.map((field) => (
          <TableRow key={field.id}>
            <TableCell className="font-medium">{field.question}</TableCell>
            <TableCell className="text-muted-foreground">
              {describeRule(field.rule)}
            </TableCell>
            <TableCell className="text-muted-foreground tabular-nums">
              {field.sortOrder}
            </TableCell>
            <TableCell>{field.isRequired ? "Si" : "No"}</TableCell>
            <TableCell>{field.isOneTime ? "Una vez" : "Cada cita"}</TableCell>
            <TableCell>
              <FlowFieldEnabledSwitch field={field} />
            </TableCell>
            <TableCell>
              <FlowFieldSheet field={field} />
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
        <FlowFieldSheet />
      </div>

      {fields.length === 0 ? (
        <Empty className="border py-20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon
                icon={ListSettingIcon}
                strokeWidth={2}
                aria-hidden="true"
              />
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
