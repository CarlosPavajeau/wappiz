import {
  addDays,
  endOfMonth,
  endOfWeek,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns"
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs"
import { useMemo } from "react"

import type { CalView } from "@/components/appointments/calendar-config"
import {
  CUSTOMER_LOOKAHEAD_DAYS,
  CUSTOMER_LOOKBACK_DAYS,
  DEFAULT_STATUSES,
  WEEK_OPTS,
  toDateKey,
} from "@/components/appointments/calendar-config"

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
    parseAsArrayOf(parseAsString).withDefault(DEFAULT_STATUSES)
  )
  const [aptId, setAptId] = useQueryState("apt", parseAsString)
  // Set while browsing one customer's appointments, which replaces the
  // day/week/month grid with a list spanning a fixed window around today.
  const [customerId, setCustomerId] = useQueryState("customer", parseAsString)

  const calView: CalView = view === "week" || view === "month" ? view : "day"
  const selectedDate = useMemo(() => parseISO(dateParam), [dateParam])

  const { from, to } = useMemo(() => {
    if (customerId !== null) {
      const today = new Date()
      return {
        from: toDateKey(subDays(today, CUSTOMER_LOOKBACK_DAYS)),
        to: toDateKey(addDays(today, CUSTOMER_LOOKAHEAD_DAYS)),
      }
    }
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
  }, [calView, customerId, dateParam, selectedDate])

  return {
    aptId,
    calView,
    customerId,
    dateParam,
    from,
    resourceIds,
    selectedDate,
    serviceIds,
    setAptId,
    setCustomerId,
    setDateParam,
    setResourceIds,
    setServiceIds,
    setStatuses,
    setView,
    statuses,
    to,
  }
}
