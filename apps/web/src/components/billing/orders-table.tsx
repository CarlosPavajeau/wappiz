import { Invoice01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery } from "@tanstack/react-query"
import type { Order } from "@wappiz/polar"
import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { authClient } from "@/lib/auth-client"
import { formatCurrency } from "@/lib/intl"

export function OrdersTable() {
  const { data: orders, isPending } = useQuery({
    queryFn: async () => {
      const result = await authClient.customer.orders.list({
        query: {
          limit: 10,
        },
      })

      if (result.error) throw result.error
      return result.data
    },
    queryKey: ["polar", "orders"],
    retry: false,
  })

  if (isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    )
  }

  const items = orders?.result?.items ?? []

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-1 py-8 text-sm text-muted-foreground">
        <HugeiconsIcon
          icon={Invoice01Icon}
          size={20}
          strokeWidth={2}
          className="mb-1 text-muted-foreground/50"
          aria-hidden="true"
        />
        No hay pagos registrados todavía.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Producto</TableHead>
          <TableHead className="text-right">Monto</TableHead>
          <TableHead className="text-right">Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((order: Order) => (
          <TableRow key={order.id}>
            <TableCell className="text-muted-foreground tabular-nums">
              {format(order.createdAt, "dd/MM/yyyy")}
            </TableCell>
            <TableCell className="font-medium">
              {order.product?.name ?? "Suscripción"}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(order.totalAmount, order.currency)}
            </TableCell>
            <TableCell className="text-right">
              <Badge
                variant={order.status === "paid" ? "default" : "outline"}
                className="ml-auto text-xs"
              >
                {order.status === "paid" ? "Pagado" : "Reembolsado"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
