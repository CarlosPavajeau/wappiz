/**
 * Calendar helpers for pages that must show times in a business's timezone
 * rather than the visitor's (a customer abroad still books local hours).
 *
 * Calendar days are represented as `Date`s at local midnight, the shape
 * react-day-picker works with; only their year/month/day fields are
 * meaningful.
 */

/** Today's calendar day in `timeZone`, as a local-midnight `Date`. */
export function todayIn(timeZone: string, now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(now)

  const field = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)

  return new Date(field("year"), field("month") - 1, field("day"))
}

/** Formats a calendar day as the API's `YYYY-MM-DD`. */
export function toDateKey(day: Date): string {
  const month = String(day.getMonth() + 1).padStart(2, "0")
  const date = String(day.getDate()).padStart(2, "0")
  return `${day.getFullYear()}-${month}-${date}`
}

/** "3:30 p. m." for an instant, read on the business's wall clock. */
export function formatTimeIn(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(instant))
}

/** The 0–23 hour of an instant on the business's wall clock. */
export function hourIn(instant: string, timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone,
    }).format(new Date(instant))
  )
}

/** "miércoles, 10 de junio" for an instant, on the business's calendar. */
export function formatDateIn(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    timeZone,
    weekday: "long",
  }).format(new Date(instant))
}
