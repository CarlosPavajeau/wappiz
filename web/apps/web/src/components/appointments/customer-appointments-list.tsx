import { CalendarOffIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { Appointment } from "@wappiz/api-client/types/appointments"
import { differenceInCalendarDays, format, isSameYear } from "date-fns"
import { es } from "date-fns/locale"

import {
  AppointmentCard,
  AppointmentSkeleton,
} from "@/components/appointments/appointment-card"
import {
  CUSTOMER_LOOKAHEAD_DAYS,
  CUSTOMER_LOOKBACK_DAYS,
  groupCustomerAppointments,
} from "@/components/appointments/calendar-config"
import type { DayGroup } from "@/components/appointments/calendar-config"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

const RELATIVE_DAY_LABELS = new Map([
  [-1, "Ayer"],
  [0, "Hoy"],
  [1, "Mañana"],
])

function dayLabel(day: Date, now: Date): string {
  const relative = RELATIVE_DAY_LABELS.get(differenceInCalendarDays(day, now))
  if (relative !== undefined) {
    return relative
  }
  return format(
    day,
    isSameYear(day, now) ? "EEEE d 'de' MMMM" : "EEEE d 'de' MMMM yyyy",
    { locale: es }
  )
}

type Props = {
  apts: Appointment[]
  onAptClick: (apt: Appointment) => void
}

export function CustomerAppointmentsList({ apts, onAptClick }: Props) {
  const now = new Date()
  const { past, upcoming } = groupCustomerAppointments(apts, now)

  if (apts.length === 0) {
    return (
      <Empty className="mt-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={CalendarOffIcon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>Sin citas para este cliente</EmptyTitle>
          <EmptyDescription>
            No hay citas en los últimos {CUSTOMER_LOOKBACK_DAYS} días ni en los
            próximos {CUSTOMER_LOOKAHEAD_DAYS} con los filtros aplicados.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pt-3 pb-16">
      {upcoming.length > 0 && (
        <Section groups={upcoming} now={now} onAptClick={onAptClick}>
          Próximas
        </Section>
      )}
      {past.length > 0 && (
        <Section groups={past} now={now} onAptClick={onAptClick}>
          Anteriores
        </Section>
      )}
    </div>
  )
}

function Section({
  children,
  groups,
  now,
  onAptClick,
}: {
  children: string
  groups: DayGroup[]
  now: Date
  onAptClick: (apt: Appointment) => void
}) {
  return (
    <section aria-label={children} className="flex flex-col gap-3">
      <h2 className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        {children}
      </h2>
      {groups.map((group) => (
        <div key={group.day.getTime()} className="flex flex-col">
          <h3 className="text-sm font-semibold first-letter:capitalize">
            {dayLabel(group.day, now)}
          </h3>
          <div className="flex flex-col divide-y divide-border">
            {group.apts.map((apt) => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                onClick={() => onAptClick(apt)}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

export function CustomerAppointmentsSkeleton() {
  return (
    <div className="flex flex-col divide-y divide-border pt-3">
      {Array.from({ length: 4 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: generated list
        <AppointmentSkeleton key={i} />
      ))}
    </div>
  )
}
