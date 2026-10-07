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
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react"
import { toast } from "sonner"

import {
  CUSTOMERS_PAGE_SIZE,
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

type TextFilters = Pick<CustomerSearch, "name" | "phone">

const EMPTY_DRAFT: CustomerSearchDraft = { name: "", phone: "" }

const filtersKey = ({ name, phone }: TextFilters) =>
  JSON.stringify([name ?? null, phone ?? null])

const draftFilters = (draft: CustomerSearchDraft): TextFilters => ({
  name: nameFilter(draft.name),
  phone: phoneFilter(draft.phone),
})

/**
 * Inputs read local state, not the URL: typing must feel instant, and only
 * the debounced value is worth a navigation and a request. The URL still wins
 * whenever it changes for another reason (Back, Forward, a shared link), so
 * the inputs never show filters the rows are not using.
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

  // Filters this hook wrote to the URL whose echo has not arrived yet, oldest
  // first. Telling our own writes apart from restores lets typing continue
  // while an earlier write lands, without that echo resetting the inputs.
  const pendingWrites = useRef<string[]>([])
  // The draft a restore replaced. Its debounce can settle in the same commit
  // as the restore, when this render still sees it as the current draft.
  const replacedDraft = useRef<CustomerSearchDraft | null>(null)

  // Only writes that change the URL produce an echo; recording any other
  // would leave an entry behind that a later restore could be mistaken for.
  const recordWrite = (filters: TextFilters) => {
    const key = filtersKey(filters)
    if (key === filtersKey(search)) {
      return false
    }
    pendingWrites.current.push(key)
    return true
  }

  const syncFromUrl = useEffectEvent((filters: TextFilters) => {
    const key = filtersKey(filters)
    const own = pendingWrites.current.indexOf(key)
    if (own !== -1) {
      pendingWrites.current.splice(0, own + 1)
      return
    }
    // A navigation we did not make supersedes anything still in flight.
    pendingWrites.current = []
    if (key !== filtersKey(draftFilters(draft))) {
      replacedDraft.current = draft
      setDraft({ name: filters.name ?? "", phone: filters.phone ?? "" })
    }
  })
  // Deriving the draft during render is not an option: telling a restore
  // from our own echo reads and consumes `pendingWrites`, which must not
  // happen in render (StrictMode renders twice and would consume it twice).
  useEffect(
    // oxlint-disable-next-line react/set-state-in-effect
    () => syncFromUrl({ name: search.name, phone: search.phone }),
    [search.name, search.phone]
  )

  // Effect events read the latest draft and URL without re-running when they
  // change, so only a newly settled debounce triggers a write.
  const applyDraft = useEffectEvent((settled: CustomerSearchDraft) => {
    // A debounce that settled on a draft a restore has since replaced must
    // not write it back over the restored URL.
    if (settled !== draft || settled === replacedDraft.current) {
      return
    }
    const filters = draftFilters(settled)
    if (recordWrite(filters)) {
      void updateSearch({ ...filters, page: undefined })
    }
  })
  useEffect(() => applyDraft(debouncedDraft), [debouncedDraft])

  /** Empties the inputs and the URL filters at once; `extra` rides along. */
  const clearDraft = (extra: Partial<CustomerSearch>) => {
    const filters: TextFilters = { name: undefined, phone: undefined }
    setDraft(EMPTY_DRAFT)
    recordWrite(filters)
    void updateSearch({ ...extra, ...filters, page: undefined })
  }

  return { clearDraft, draft, setDraft }
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
  const { clearDraft, draft, setDraft } = useSearchDraft(search, updateSearch)

  const { data, isError, isFetching, isPending, isPlaceholderData, refetch } =
    useQuery(
      listCustomersQuery({
        limit: CUSTOMERS_PAGE_SIZE,
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
      const lastPage = Math.ceil(data.total / CUSTOMERS_PAGE_SIZE)
      void updateSearch({ page: lastPage > 1 ? lastPage : undefined })
    }
  }, [data, isPlaceholderData, updateSearch])

  const clearFilters = () => clearDraft({ status: undefined })

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
            limit={CUSTOMERS_PAGE_SIZE}
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
