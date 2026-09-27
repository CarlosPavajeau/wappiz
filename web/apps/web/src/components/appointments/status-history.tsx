import { useQuery } from "@tanstack/react-query"
import type { AppointmentStatusHistory } from "@wappiz/api-client/types/appointments"
import { format } from "date-fns"

import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/client-api"

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "../ui/empty"
import { StatusBadge } from "./status-badge"

type Props = {
  appointmentId: string
}

export function AppointmentStatusHistory({ appointmentId }: Props) {
  const { data: history, isLoading } = useQuery({
    queryFn: () => api.appointments.history(appointmentId),
    queryKey: ["appointments", appointmentId, "history"],
  })

  if (isLoading) {
    return <HistorySkeleton />
  }

  if (!history || history.length === 0) {
    return (
      <Empty className="border-0 p-0 py-4">
        <EmptyHeader>
          <EmptyTitle>Sin historial</EmptyTitle>
          <EmptyDescription>
            No hay cambios de estado registrados para esta cita.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ol className="flex flex-col">
      {history.map((entry) => (
        <HistoryItem key={entry.id} entry={entry} />
      ))}
    </ol>
  )
}

type HistoryItemProps = {
  entry: AppointmentStatusHistory
}

function HistoryItem({ entry }: HistoryItemProps) {
  const date = format(new Date(entry.createdAt), "dd/MM/yyyy · h:mm a")

  return (
    <li className="flex gap-3">
      <div aria-hidden className="flex flex-col items-center">
        <div className="mt-1 size-2 shrink-0 rounded-full bg-border ring-2 ring-background" />
        <div className="mt-1 w-px flex-1 bg-border last:hidden" />
      </div>
      <div className="flex flex-col gap-1 pb-4">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <StatusBadge status={entry.fromStatus} />
          <span className="text-muted-foreground" aria-label="hacia">
            →
          </span>
          <StatusBadge status={entry.toStatus} />
        </div>
        {entry.changedBy ? (
          <p className="text-xs text-muted-foreground">{entry.changedBy}</p>
        ) : null}
        {entry.reason ? (
          <p className="text-xs text-foreground/70 italic">
            &quot;{entry.reason}&quot;
          </p>
        ) : null}
        <time
          className="text-xs text-muted-foreground/60"
          dateTime={entry.createdAt}
        >
          {date}
        </time>
      </div>
    </li>
  )
}

function HistorySkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy
      aria-label="Cargando historial"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <Skeleton className="mt-1 size-2 rounded-full" />
            <Skeleton className="mt-1 w-px flex-1" />
          </div>
          <div className="flex flex-col gap-1.5 pb-4">
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}
