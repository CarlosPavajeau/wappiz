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
  todayDayOfWeek?: number
}

export function WorkingHoursCard({
  resourceId,
  workingHours,
  defaultOpen,
  todayDayOfWeek,
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
            Sin horario configurado — este recurso no recibirá reservas
          </p>
        ) : (
          <ul>
            {sorted.map((hour) => {
              const isToday =
                todayDayOfWeek !== undefined &&
                hour.dayOfWeek === todayDayOfWeek

              return (
                <li
                  key={hour.id}
                  className={cn(
                    "-mx-2 flex items-center justify-between rounded px-2 py-2 text-sm",
                    !hour.isActive && "text-muted-foreground",
                    isToday && hour.isActive && "bg-primary/5 font-medium"
                  )}
                >
                  <span className="capitalize">
                    {hour.dayName.toLowerCase()}
                  </span>
                  {hour.isActive ? (
                    <span className="tabular-nums">
                      {formatTime(hour.startTime)} – {formatTime(hour.endTime)}
                    </span>
                  ) : (
                    <span>Cerrado</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
