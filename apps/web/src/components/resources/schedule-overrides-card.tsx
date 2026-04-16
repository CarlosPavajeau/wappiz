import type { ScheduleOverride } from "@wappiz/api-client/types/resources"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { CreateScheduleOverrideDialog } from "./create-schedule-override-dialog"
import { DeleteOverrideButton } from "./delete-override-button"

const timeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "numeric",
  hour12: true,
  minute: "2-digit",
})

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  const date = new Date(1970, 0, 1, hours, minutes)
  return timeFormatter.format(date)
}

type Props = {
  resourceId: string
  overrides: ScheduleOverride[]
}

export function ScheduleOverridesCard({ resourceId, overrides }: Props) {
  const sorted = [...overrides].toSorted((a, b) => a.date.localeCompare(b.date))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Excepciones de horario</CardTitle>
        <CardAction>
          <CreateScheduleOverrideDialog resourceId={resourceId} />
        </CardAction>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin excepciones configuradas
          </p>
        ) : (
          <ul className="divide-y">
            {sorted.map((override) => (
              <li
                key={override.id}
                className="flex items-start justify-between gap-4 py-2.5 text-sm"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium capitalize">
                    {format(parseISO(override.date), "d MMM yyyy", {
                      locale: es,
                    })}
                  </p>
                  {override.reason && (
                    <p className="truncate text-xs text-muted-foreground">
                      {override.reason}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-muted-foreground tabular-nums">
                    {override.isDayOff
                      ? "Cerrado"
                      : override.startTime && override.endTime
                        ? `${formatTime(override.startTime)} – ${formatTime(override.endTime)}`
                        : null}
                  </span>
                  <DeleteOverrideButton
                    resourceId={resourceId}
                    overrideId={override.id}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
