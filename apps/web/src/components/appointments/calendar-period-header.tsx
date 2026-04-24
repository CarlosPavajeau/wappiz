type Props = {
  periodLabel: string
  aptCount: number
}

export function CalendarPeriodHeader({ periodLabel, aptCount }: Props) {
  return (
    <div className="flex items-center gap-2 pb-3">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] leading-none font-semibold tracking-tight text-foreground first-letter:capitalize">
              {periodLabel}
            </span>
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            {aptCount} {aptCount === 1 ? "cita" : "citas"} agendadas
          </div>
        </div>
      </div>
    </div>
  )
}
