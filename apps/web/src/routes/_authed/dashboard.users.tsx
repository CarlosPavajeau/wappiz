import { UserMultiple02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { createFileRoute } from "@tanstack/react-router"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { UsersTable } from "@/components/users/users-table"
import { listUsers } from "@/functions/list-users"

const PAGE_SIZE = 20

export const Route = createFileRoute("/_authed/dashboard/users")({
  component: RouteComponent,
  loader: ({ deps: { page, limit } }) => listUsers({ data: { limit, page } }),
  loaderDeps: ({ search: { page, limit } }) => ({ limit, page }),
  validateSearch: (search: Record<string, unknown>) => {
    const raw = Number(search["page"])
    return {
      limit: PAGE_SIZE,
      page: Number.isInteger(raw) && raw > 0 ? raw : 1,
    }
  },
})

function RouteComponent() {
  const { users, total } = Route.useLoaderData()
  const { page, limit } = Route.useSearch()

  if (users.length === 0) {
    return (
      <Empty className="border py-20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon
              icon={UserMultiple02Icon}
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </EmptyMedia>
          <EmptyTitle>Sin usuarios</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <EmptyDescription>
            No hay usuarios registrados en la plataforma.
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? "usuario" : "usuarios"} en total
        </p>
      </div>

      <UsersTable
        users={users}
        total={total}
        page={page}
        limit={limit}
        routeFullPath={Route.fullPath}
      />
    </div>
  )
}
