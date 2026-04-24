import {
  endOfMonth,
  endOfWeek,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs"
import { useMemo } from "react"

import type { CalView } from "@/components/appointments/calendar-config"
import { WEEK_OPTS, toDateKey } from "@/components/appointments/calendar-config"

export function useCalendarUrl() {
  const [view, setView] = useQueryState(
    "view",
    parseAsString.withDefault("day")
  )
  const [dateParam, setDateParam] = useQueryState(
    "date",
    parseAsString.withDefault(toDateKey(new Date()))
  )
  const [resourceIds, setResourceIds] = useQueryState(
    "resources",
    parseAsArrayOf(parseAsString).withDefault([])
  )
  const [serviceIds, setServiceIds] = useQueryState(
    "services",
    parseAsArrayOf(parseAsString).withDefault([])
  )
  const [statuses, setStatuses] = useQueryState(
    "statuses",
    parseAsArrayOf(parseAsString).withDefault([
      "in_progress",
      "confirmed",
      "check_in",
    ])
  )

  const calView: CalView = view === "week" || view === "month" ? view : "day"
  const selectedDate = useMemo(() => parseISO(dateParam), [dateParam])

  const { from, to } = useMemo(() => {
    if (calView === "week") {
      return {
        from: toDateKey(startOfWeek(selectedDate, WEEK_OPTS)),
        to: toDateKey(endOfWeek(selectedDate, WEEK_OPTS)),
      }
    }
    if (calView === "month") {
      return {
        from: toDateKey(startOfMonth(selectedDate)),
        to: toDateKey(endOfMonth(selectedDate)),
      }
    }
    return { from: dateParam, to: dateParam }
  }, [calView, dateParam, selectedDate])

  return {
    calView,
    dateParam,
    from,
    resourceIds,
    selectedDate,
    serviceIds,
    setDateParam,
    setResourceIds,
    setServiceIds,
    setStatuses,
    setView,
    statuses,
    to,
  }
}
