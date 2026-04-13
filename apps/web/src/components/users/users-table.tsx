import { useNavigate } from "@tanstack/react-router"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import type { SortingState } from "@tanstack/react-table"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AdminUser } from "@/functions/list-users"

const columnHelper = createColumnHelper<AdminUser>()

function getPageRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const delta = 1
  const left = Math.max(2, current - delta)
  const right = Math.min(total - 1, current + delta)
  const pages: (number | "ellipsis")[] = [1]
  if (left > 2) pages.push("ellipsis")
  for (let i = left; i <= right; i++) pages.push(i)
  if (right < total - 1) pages.push("ellipsis")
  pages.push(total)
  return pages
}

function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es", {
      year: "numeric",
      month: "short",
      day: "numeric",
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

  const hue = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360

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
        id: "user",
        header: "Usuario",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <UserAvatar name={row.original.name} />
            <div className="min-w-0">
              <p className="truncate font-medium leading-none">
                {row.original.name}
              </p>
              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                {row.original.email}
              </p>
            </div>
          </div>
        ),
      }),
      columnHelper.accessor("role", {
        header: "Rol",
        cell: ({ getValue }) => {
          const role = getValue() ?? "user"
          return (
            <Badge variant={role === "admin" ? "default" : "secondary"}>
              {role}
            </Badge>
          )
        },
      }),
      columnHelper.accessor("emailVerified", {
        header: "Email",
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
      }),
      columnHelper.accessor("banned", {
        header: "Estado",
        cell: ({ getValue }) =>
          getValue() === true ? (
            <Badge variant="destructive">Baneado</Badge>
          ) : (
            <Badge variant="outline">Activo</Badge>
          ),
      }),
      columnHelper.accessor("createdAt", {
        header: "Registrado",
        cell: ({ getValue }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatShortDate(getValue())}
          </span>
        ),
      }),
    ],
    []
  )

  const pageCount = Math.ceil(total / limit)

  const table = useReactTable({
    data: users,
    columns,
    pageCount,
    state: {
      sorting,
      pagination: { pageIndex: page - 1, pageSize: limit },
    },
    onSortingChange: setSorting,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
          <p className="text-muted-foreground text-sm">
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
                    if (page > 1) goToPage(page - 1)
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
                    if (page < pageCount) goToPage(page + 1)
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
