import {
  CircleLock01Icon,
  CircleUnlock01Icon,
  MoreHorizontalIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import type { Customer } from "@wappiz/api-client/types/customers"
import { useCallback, useState } from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/lib/client-api"

export const Route = createFileRoute("/_authed/dashboard/customers")({
  component: RouteComponent,
  loader: async () => {
    const customers = await api.customers.list()
    return { customers }
  },
})

function CustomerRowActions({ customer }: { customer: Customer }) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const action = customer.isBlocked ? "unblock" : "block"
  const openConfirm = useCallback(() => setConfirmOpen(true), [])

  const confirmLabel = action === "block" ? "Bloquear" : "Desbloquear"
  const successMessage =
    action === "block"
      ? `${customer.displayName} bloqueado correctamente`
      : `${customer.displayName} desbloqueado correctamente`

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      action === "block"
        ? api.customers.block(customer.id)
        : api.customers.unblock(customer.id),
    onError: () => {
      toast.error("Ocurrió un error. Intenta de nuevo.")
    },
    onSuccess: () => {
      setConfirmOpen(false)
      toast.success(successMessage)
      router.invalidate()
    },
  })

  const handleBlockClick = useCallback(() => {
    mutate()
  }, [mutate])

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label="Abrir acciones"
              size="sm"
              variant="ghost"
              className="size-8 p-0"
            >
              <HugeiconsIcon
                icon={MoreHorizontalIcon}
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            variant={action === "block" ? "destructive" : "default"}
            onClick={openConfirm}
          >
            <HugeiconsIcon
              icon={action === "block" ? CircleLock01Icon : CircleUnlock01Icon}
              size={14}
              strokeWidth={2}
              aria-hidden="true"
            />
            {action === "block" ? "Bloquear" : "Desbloquear"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === "block"
                ? `¿Bloquear a ${customer.displayName}?`
                : `¿Desbloquear a ${customer.displayName}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === "block"
                ? "El cliente no podrá realizar nuevas reservas mientras esté bloqueado."
                : "El cliente podrá volver a realizar reservas."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              variant={action === "block" ? "destructive" : "default"}
              onClick={handleBlockClick}
            >
              {isPending ? <Spinner /> : confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function RouteComponent() {
  const { customers } = Route.useLoaderData()

  const customerCount = customers.length
  const customerLabel =
    customerCount === 0
      ? "Sin clientes registrados"
      : `${customerCount} ${customerCount === 1 ? "cliente" : "clientes"}`

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-start justify-between gap-4 sm:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Clientes
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{customerLabel}</p>
        </div>
      </div>

      <Separator />

      {customerCount === 0 ? (
        <Empty className="border py-20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon
                icon={UserGroupIcon}
                size={16}
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </EmptyMedia>
            <EmptyTitle>Sin clientes</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <EmptyDescription>
              Los clientes aparecerán aquí cuando realicen su primera reserva.
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{customer.displayName}</span>
                    {customer.name !== customer.displayName && (
                      <span className="text-muted-foreground text-xs">
                        {customer.name}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {customer.phoneNumber}
                </TableCell>
                <TableCell>
                  {customer.isBlocked ? (
                    <Badge variant="destructive">Bloqueado</Badge>
                  ) : (
                    <Badge variant="outline">Activo</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <CustomerRowActions customer={customer} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
