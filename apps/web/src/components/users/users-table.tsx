import {
  CircleLock01Icon,
  CircleUnlock01Icon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "@tanstack/react-query"
import { useNavigate, useRouter } from "@tanstack/react-router"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import type { SortingState } from "@tanstack/react-table"
import { useCallback, useMemo, useState } from "react"
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AdminUser } from "@/functions/list-users"
import { banUser, unbanUser } from "@/functions/user-actions"

const columnHelper = createColumnHelper<AdminUser>()

function UserRowActions({ user }: { user: AdminUser }) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const openConfirm = useCallback(() => setConfirmOpen(true), [])

  const isBanned = user.banned === true

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      isBanned
        ? unbanUser({ data: { userId: user.id } })
        : banUser({ data: { userId: user.id } }),
    onError: () => {
      toast.error("Ocurrió un error. Intenta de nuevo.")
    },
    onSuccess: () => {
      setConfirmOpen(false)
      toast.success(
        isBanned ? `${user.name} fue desbaneado` : `${user.name} fue baneado`
      )
      router.invalidate()
    },
  })

  const handleConfirm = useCallback(() => {
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
            variant={isBanned ? "default" : "destructive"}
            onClick={openConfirm}
          >
            <HugeiconsIcon
              icon={isBanned ? CircleUnlock01Icon : CircleLock01Icon}
              size={14}
              strokeWidth={2}
              aria-hidden="true"
            />
            {isBanned ? "Desbanear" : "Banear"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isBanned
                ? `¿Desbanear a ${user.name}?`
                : `¿Banear a ${user.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isBanned
                ? "El usuario podrá volver a iniciar sesión."
                : "El usuario no podrá iniciar sesión mientras esté baneado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              variant={isBanned ? "default" : "destructive"}
              onClick={handleConfirm}
            >
              {isPending ? <Spinner /> : (isBanned ? "Desbanear" : "Banear")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function getPageRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const delta = 1
  const left = Math.max(2, current - delta)
  const right = Math.min(total - 1, current + delta)
  const pages: (number | "ellipsis")[] = [1]
  if (left > 2) {
    pages.push("ellipsis")
  }
  for (let i = left; i <= right; i++) {
    pages.push(i)
  }
  if (right < total - 1) {
    pages.push("ellipsis")
  }
  pages.push(total)
  return pages
}

function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()

  const hue = [...name].reduce((acc, c) => acc + c.codePointAt(0), 0) % 360

  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white select-none"
      style={{ backgroundColor: `hsl(${hue} 50% 42%)` }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}

type UsersTableProps = {
  users: AdminUser[]
  total: number
  page: number
  limit: number
  routeFullPath: string
}

export function UsersTable({
  users,
  total,
  page,
  limit,
  routeFullPath,
}: UsersTableProps) {
  const navigate = useNavigate({ from: routeFullPath })
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo(
    () => [
      columnHelper.display({
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <UserAvatar name={row.original.name} />
            <div className="min-w-0">
              <p className="truncate leading-none font-medium">
                {row.original.name}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {row.original.email}
              </p>
            </div>
          </div>
        ),
        header: "Usuario",
        id: "user",
      }),
      columnHelper.accessor("role", {
        cell: ({ getValue }) => {
          const role = getValue() ?? "user"
          return (
            <Badge variant={role === "admin" ? "default" : "secondary"}>
              {role}
            </Badge>
          )
        },
        header: "Rol",
      }),
      columnHelper.accessor("emailVerified", {
        cell: ({ getValue }) =>
          getValue() ? (
            <Badge
              variant="outline"
              className="text-emerald-600 dark:text-emerald-400"
            >
              Verificado
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-amber-600 dark:text-amber-400"
            >
              Pendiente
            </Badge>
          ),
        header: "Email",
      }),
      columnHelper.accessor("banned", {
        cell: ({ getValue }) =>
          getValue() === true ? (
            <Badge variant="destructive">Baneado</Badge>
          ) : (
            <Badge variant="outline">Activo</Badge>
          ),
        header: "Estado",
      }),
      columnHelper.accessor("createdAt", {
        cell: ({ getValue }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatShortDate(getValue())}
          </span>
        ),
        header: "Registrado",
      }),
      columnHelper.display({
        cell: ({ row }) => <UserRowActions user={row.original} />,
        id: "actions",
      }),
    ],
    []
  )

  const pageCount = Math.ceil(total / limit)

  const table = useReactTable({
    columns,
    data: users,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    onSortingChange: setSorting,
    pageCount,
    state: {
      pagination: { pageIndex: page - 1, pageSize: limit },
      sorting,
    },
  })

  const goToPage = (p: number) => {
    void navigate({ search: (prev) => ({ ...prev, page: p }) })
  }

  const firstItem = (page - 1) * limit + 1
  const lastItem = Math.min(page * limit, total)
  const pages = getPageRange(page, pageCount)

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pageCount > 1 && (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {firstItem}–{lastItem} de {total}{" "}
            {total === 1 ? "usuario" : "usuarios"}
          </p>

          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={`?page=${Math.max(1, page - 1)}`}
                  onClick={(e) => {
                    e.preventDefault()
                    if (page > 1) {
                      goToPage(page - 1)
                    }
                  }}
                  aria-disabled={page <= 1}
                  className={
                    page <= 1 ? "pointer-events-none opacity-50" : undefined
                  }
                  text="Anterior"
                />
              </PaginationItem>

              {pages.map((p, i) =>
                p === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href={`?page=${p}`}
                      isActive={p === page}
                      onClick={(e) => {
                        e.preventDefault()
                        goToPage(p)
                      }}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  href={`?page=${Math.min(pageCount, page + 1)}`}
                  onClick={(e) => {
                    e.preventDefault()
                    if (page < pageCount) {
                      goToPage(page + 1)
                    }
                  }}
                  aria-disabled={page >= pageCount}
                  className={
                    page >= pageCount
                      ? "pointer-events-none opacity-50"
                      : undefined
                  }
                  text="Siguiente"
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}
