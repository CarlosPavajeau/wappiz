import {
  CircleLock01Icon,
  CircleUnlock01Icon,
  MoreHorizontalIcon,
  Refresh03Icon,
  Search01Icon,
  UserGroupIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import type { Customer } from "@wappiz/api-client/types/customers"
import { useCallback, useEffect, useEffectEvent, useState } from "react"
import { toast } from "sonner"

import {
  CustomerFiltersBar,
  hasActiveFilters,
  nameFilter,
  parseCustomerSearch,
  phoneFilter,
} from "@/components/customers/customer-filters"
import type {
  CustomerSearch,
  CustomerSearchDraft,
} from "@/components/customers/customer-filters"
import { DefaultLoader } from "@/components/default-loader"
import { PaginationBar } from "@/components/pagination-bar"
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
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { api } from "@/lib/client-api"
import { formatPhoneNumber } from "@/lib/intl"
import { cn } from "@/lib/utils"
import { customersQueryKey, listCustomersQuery } from "@/queries/customers"

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

// Data is fetched with React Query in the component, not a route loader: a
// loader keyed on the search would swap the page for the pending screen on
// every keystroke, while the query keeps the previous page visible.
export const Route = createFileRoute("/_authed/dashboard/customers/")({
  component: RouteComponent,
  validateSearch: parseCustomerSearch,
})

function CustomerRowActions({ customer }: { customer: Customer }) {
  const queryClient = useQueryClient()
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
      void queryClient.invalidateQueries({ queryKey: customersQueryKey })
      void queryClient.invalidateQueries({
        queryKey: ["customer", customer.id],
      })
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
              className="size-10 p-0"
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

          <DropdownMenuItem
            render={
              <Link
                to="/dashboard/customers/$id"
                params={{ id: customer.id }}
              />
            }
            nativeButton={false}
          >
            <HugeiconsIcon icon={ViewIcon} strokeWidth={2} aria-hidden="true" />
            Ver detalles
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

function NoMatches({ onClear }: { onClear: () => void }) {
  return (
    <Empty className="border py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={2}
            aria-hidden="true"
          />
        </EmptyMedia>
        <EmptyTitle>Sin resultados</EmptyTitle>
        <EmptyDescription>
          Ningún cliente coincide con los filtros aplicados.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onClear}>
          Limpiar filtros
        </Button>
      </EmptyContent>
    </Empty>
  )
}

/**
 * Inputs read local state, not the URL: typing must feel instant, and only
 * the debounced value is worth a navigation and a request.
 */
function useSearchDraft(
  search: CustomerSearch,
  updateSearch: (patch: Partial<CustomerSearch>) => unknown
) {
  const [draft, setDraft] = useState<CustomerSearchDraft>({
    name: search.name ?? "",
    phone: search.phone ?? "",
  })
  const debouncedDraft = useDebouncedValue(draft, SEARCH_DEBOUNCE_MS)

  // An effect event reads the latest URL without re-running on URL changes;
  // otherwise clearing the filters would race the stale debounced text and
  // write it back.
  const applyDraft = useEffectEvent((next: CustomerSearchDraft) => {
    const name = nameFilter(next.name)
    const phone = phoneFilter(next.phone)
    if (name !== search.name || phone !== search.phone) {
      void updateSearch({ name, page: undefined, phone })
    }
  })
  useEffect(() => applyDraft(debouncedDraft), [debouncedDraft])

  return [draft, setDraft] as const
}

function LoadError({
  retrying,
  onRetry,
}: {
  retrying: boolean
  onRetry: () => void
}) {
  return (
    <Empty className="border py-20">
      <EmptyHeader>
        <EmptyTitle>No se pudieron cargar los clientes</EmptyTitle>
        <EmptyDescription>
          Revisa tu conexión e intenta de nuevo.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" disabled={retrying} onClick={onRetry}>
          {retrying ? (
            <Spinner />
          ) : (
            <HugeiconsIcon
              icon={Refresh03Icon}
              strokeWidth={2}
              data-icon="inline-start"
              aria-hidden="true"
            />
          )}
          Reintentar
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function RouteComponent() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const router = useRouter()
  const page = search.page ?? 1

  const updateSearch = useCallback(
    (patch: Partial<CustomerSearch>) =>
      navigate({ replace: true, search: (prev) => ({ ...prev, ...patch }) }),
    [navigate]
  )
  const [draft, setDraft] = useSearchDraft(search, updateSearch)

  const { data, isError, isFetching, isPending, isPlaceholderData, refetch } =
    useQuery(
      listCustomersQuery({
        limit: PAGE_SIZE,
        name: search.name,
        page,
        phone: search.phone,
        status: search.status,
      })
    )

  // Blocking or a hand-edited URL can leave the page past the last one.
  // Jump to the last page that still has rows instead of showing nothing.
  useEffect(() => {
    if (
      data !== undefined &&
      !isPlaceholderData &&
      data.customers.length === 0 &&
      data.total > 0
    ) {
      const lastPage = Math.ceil(data.total / PAGE_SIZE)
      void updateSearch({ page: lastPage > 1 ? lastPage : undefined })
    }
  }, [data, isPlaceholderData, updateSearch])

  const clearFilters = useCallback(() => {
    setDraft({ name: "", phone: "" })
    void updateSearch({
      name: undefined,
      page: undefined,
      phone: undefined,
      status: undefined,
    })
  }, [setDraft, updateSearch])

  const goToPage = useCallback(
    (target: number) =>
      navigate({
        search: (prev) => ({ ...prev, page: target > 1 ? target : undefined }),
      }),
    [navigate]
  )

  const hrefFor = (target: number) =>
    router.buildLocation({
      search: { ...search, page: target > 1 ? target : undefined },
      to: "/dashboard/customers",
    }).href

  if (isPending) {
    return <DefaultLoader />
  }

  if (isError) {
    return <LoadError retrying={isFetching} onRetry={() => refetch()} />
  }

  const filtering = hasActiveFilters(search)

  if (data.total === 0 && !filtering) {
    return (
      <Empty className="border py-20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon
              icon={UserGroupIcon}
              strokeWidth={2}
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
    )
  }

  return (
    <div className="grid gap-4">
      <CustomerFiltersBar
        draft={draft}
        status={search.status}
        onDraftChange={setDraft}
        onStatusChange={(status) => updateSearch({ page: undefined, status })}
      />
      {filtering && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {data.total}{" "}
          {data.total === 1 ? "cliente encontrado" : "clientes encontrados"}
        </p>
      )}
      {data.total === 0 ? (
        <NoMatches onClear={clearFilters} />
      ) : (
        <div
          className={cn(
            "grid gap-4 transition-opacity",
            isPlaceholderData && "opacity-60"
          )}
          aria-busy={isPlaceholderData}
        >
          <CustomersTable customers={data.customers} />
          <PaginationBar
            page={page}
            limit={PAGE_SIZE}
            total={data.total}
            noun={{ one: "cliente", other: "clientes" }}
            hrefFor={hrefFor}
            onPageChange={goToPage}
          />
        </div>
      )}
    </div>
  )
}

function CustomersTable({ customers }: { customers: Customer[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="hidden md:table-cell">No shows</TableHead>
          <TableHead className="hidden md:table-cell">
            Cancelaciones tardías
          </TableHead>
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
                  <span className="text-xs text-muted-foreground">
                    {customer.name}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell className="hidden text-muted-foreground sm:table-cell">
              {formatPhoneNumber(customer.phoneNumber)}
            </TableCell>
            <TableCell>
              {customer.isBlocked ? (
                <Badge variant="destructive">Bloqueado</Badge>
              ) : (
                <Badge variant="outline">Activo</Badge>
              )}
            </TableCell>
            <TableCell className="hidden text-muted-foreground md:table-cell">
              {customer.noShowCount}
            </TableCell>
            <TableCell className="hidden text-muted-foreground md:table-cell">
              {customer.lateCancelCount}
            </TableCell>
            <TableCell>
              <CustomerRowActions customer={customer} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
