import { Link } from "@tanstack/react-router"
import type { Resource } from "@wappiz/api-client/types/resources"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

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

function ResourceAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()

  return (
    <div
      role="img"
      aria-label={name}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary ring-1 ring-primary/20"
    >
      {initials}
    </div>
  )
}

export function ResourceCard({ resource }: { resource: Resource }) {
  const activeCount = resource.workingHours.filter((h) => h.isActive).length
  const sortedHours = [...resource.workingHours]

  return (
    <Card className="relative ring-1 ring-border transition-shadow duration-200 hover:ring-foreground/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <ResourceAvatar name={resource.name} />
          <div className="min-w-0">
            <CardTitle className="truncate">
              <Link
                to="/dashboard/resources/$id"
                params={{ id: resource.id }}
                className="after:absolute after:inset-0 after:content-[''] hover:underline"
              >
                {resource.name}
              </Link>
            </CardTitle>
            <CardDescription className="capitalize">
              {resource.type}
            </CardDescription>
          </div>
        </div>
        <CardAction>
          <Badge variant="outline" aria-label={`${activeCount} días activos`}>
            {activeCount}d
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent>
        {sortedHours.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin horario configurado
          </p>
        ) : (
          <ul aria-label="Horario semanal" className="space-y-1">
            {sortedHours.map((hour) => (
              <li
                key={hour.id}
                className={cn(
                  "flex items-center justify-between py-0.5 text-sm",
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
