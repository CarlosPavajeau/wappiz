import type { Appointment } from "@wappiz/api-client/types/appointments"
import { format, getHours, getMinutes } from "date-fns"

import { STATUS_COLOR, STATUS_LABEL, statusColor } from "./appointment-utils"

// ── Grid constants ────────────────────────────────────────────────────────────

export const HOUR_HEIGHT = 64
export const START_HOUR = 7
export const END_HOUR = 22
export const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i
)
export const GRID_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT
export const WEEK_OPTS = { weekStartsOn: 1 as const }

export type CalView = "day" | "week" | "month"

// ── Formatters ────────────────────────────────────────────────────────────────

export function toDateKey(d: Date) {
  return format(d, "yyyy-MM-dd")
}

export function formatHour(h: number): string {
  if (h === 0) {
    return "12 am"
  }
  if (h === 12) {
    return "12 pm"
  }
  if (h < 12) {
    return `${h} am`
  }
  return `${h - 12} pm`
}

export function formatTimeRange(startsAt: string, endsAt: string): string {
  const s = new Date(startsAt)
  const e = new Date(endsAt)
  return `${format(s, "h:mm")} – ${format(e, "h:mm a")}`
}

export function formatStartTime(startsAt: string): string {
  return format(new Date(startsAt), "h:mm a")
}

// ── Status colors ─────────────────────────────────────────────────────────────

const APT_COLORS: Record<string, string> = {
  cancelled:
    "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive",
  check_in:
    "bg-teal-500/10 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300",
  completed: "bg-muted text-muted-foreground",
  confirmed: "bg-primary/10 text-primary",
  in_progress:
    "bg-blue-500/10 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  no_show:
    "bg-orange-500/10 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
  pending:
    "bg-amber-500/10 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
}

export const STATUS_ITEMS = Object.entries(STATUS_LABEL).map(([id, label]) => ({
  color: statusColor(id) ?? STATUS_COLOR.pending,
  id,
  label,
}))

export function aptColor(status: string) {
  return APT_COLORS[status] ?? APT_COLORS.pending
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

export function aptTop(startsAt: string): number {
  const d = new Date(startsAt)
  return (getHours(d) - START_HOUR + getMinutes(d) / 60) * HOUR_HEIGHT
}

export function aptHeight(startsAt: string, endsAt: string): number {
  const mins =
    (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000
  return Math.max((mins / 60) * HOUR_HEIGHT, 28)
}

export function groupByDate(
  apts: Appointment[]
): Record<string, Appointment[]> {
  const map: Record<string, Appointment[]> = {}
  for (const a of apts) {
    const key = toDateKey(new Date(a.startsAt))
    ;(map[key] ??= []).push(a)
  }
  return map
}

// ── Overlap layout ────────────────────────────────────────────────────────────

export type PlacedApt = {
  apt: Appointment
  col: number
  colCount: number
}

export function layoutApts(apts: Appointment[]): PlacedApt[] {
  const sorted = [...apts].toSorted(
    (a, b) =>
      new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() ||
      new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime()
  )

  // Greedy column assignment: find first column that is free at apt's start
  const colEnds: number[] = []
  const placed: { apt: Appointment; col: number }[] = []

  for (const apt of sorted) {
    const s = new Date(apt.startsAt).getTime()
    const e = new Date(apt.endsAt).getTime()
    let col = -1
    for (let i = 0; i < colEnds.length; i++) {
      if ((colEnds[i] ?? 0) <= s) {
        colEnds[i] = e
        col = i
        break
      }
    }
    if (col === -1) {
      colEnds.push(e)
      col = colEnds.length - 1
    }
    placed.push({ apt, col })
  }

  // Per-group colCount: sweep in start-time order.
  // A group ends when an apt starts at or after the running group-end time.
  // colCount for the group = maxCol + 1 (cols are 0-based and contiguous).
  const colCounts = new Array<number>(placed.length)
  let groupStart = 0
  let groupEndMs = 0
  let groupMaxCol = 0

  const closeGroup = (exclusiveEnd: number) => {
    const count = groupMaxCol + 1
    for (let i = groupStart; i < exclusiveEnd; i++) {
      colCounts[i] = count
    }
  }

  for (let i = 0; i < placed.length; i++) {
    const p = placed[i]
    if (!p) {
      continue
    }
    const s = new Date(p.apt.startsAt).getTime()
    const e = new Date(p.apt.endsAt).getTime()

    if (i === 0) {
      groupEndMs = e
      groupMaxCol = p.col
    } else if (s < groupEndMs) {
      groupEndMs = Math.max(groupEndMs, e)
      groupMaxCol = Math.max(groupMaxCol, p.col)
    } else {
      closeGroup(i)
      groupStart = i
      groupEndMs = e
      groupMaxCol = p.col
    }
  }
  if (placed.length > 0) {
    closeGroup(placed.length)
  }

  return placed.map((p, i) => ({ ...p, colCount: colCounts[i] ?? 1 }))
}
