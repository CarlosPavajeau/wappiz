import type { WorkingHour } from "@wappiz/api-client/types/resources"

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { UpdateWorkingHoursDialog } from "./update-working-hours-dialog"

const timeFormatter = new Intl.DateTimeFormat("en-US", {
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
  workingHours: WorkingHour[]
  defaultOpen?: boolean
}

export function WorkingHoursCard({
  resourceId,
  workingHours,
  defaultOpen,
}: Props) {
  const sorted = workingHours.toSorted((a, b) => a.dayOfWeek - b.dayOfWeek)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horario semanal</CardTitle>
        <CardAction>
          <UpdateWorkingHoursDialog
            resourceId={resourceId}
            workingHours={workingHours}
            defaultOpen={defaultOpen}
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin horario configurado
          </p>
        ) : (
          <ul aria-label="Horario semanal" className="divide-y">
            {sorted.map((hour) => (
              <li
                key={hour.id}
                className={cn(
                  "flex items-center justify-between py-2.5 text-sm",
                  !hour.isActive && "text-muted-foreground"
                )}
              >
                <span className="capitalize">{hour.dayName.toLowerCase()}</span>
                {hour.isActive ? (
                  <span className="tabular-nums">
                    {formatTime(hour.startTime)} – {formatTime(hour.endTime)}
                  </span>
                ) : (
                  <span>Cerrado</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
