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

const ALL_DAYS = [
  { dayName: "Domingo", dayOfWeek: 0 },
  { dayName: "Lunes", dayOfWeek: 1 },
  { dayName: "Martes", dayOfWeek: 2 },
  { dayName: "Miércoles", dayOfWeek: 3 },
  { dayName: "Jueves", dayOfWeek: 4 },
  { dayName: "Viernes", dayOfWeek: 5 },
  { dayName: "Sábado", dayOfWeek: 6 },
]

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
  const active = workingHours.filter((h) => h.isActive)

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
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin horario configurado — este recurso no recibirá reservas
          </p>
        ) : (
          <ul>
            {ALL_DAYS.map((day) => {
              const intervals = active
                .filter((h) => h.dayOfWeek === day.dayOfWeek)
                .toSorted((a, b) => a.startTime.localeCompare(b.startTime))
              const isOpen = intervals.length > 0
              const isToday =
                todayDayOfWeek !== undefined && day.dayOfWeek === todayDayOfWeek

              return (
                <li
                  key={day.dayOfWeek}
                  className={cn(
                    "-mx-2 flex items-center justify-between gap-4 rounded px-2 py-2 text-sm",
                    !isOpen && "text-muted-foreground",
                    isToday && isOpen && "bg-primary/5 font-medium"
                  )}
                >
                  <span className="capitalize">
                    {day.dayName.toLowerCase()}
                  </span>
                  {isOpen ? (
                    <span className="text-right tabular-nums">
                      {intervals
                        .map(
                          (h) =>
                            `${formatTime(h.startTime)} – ${formatTime(h.endTime)}`
                        )
                        .join(" · ")}
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
