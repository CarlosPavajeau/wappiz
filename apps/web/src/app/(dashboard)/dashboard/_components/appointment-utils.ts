import {
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  User02Icon,
  UserRemove01Icon,
} from "@hugeicons/core-free-icons"
import type { AppointmentStatus } from "@wappiz/api-client/types/appointments"
import { format } from "date-fns"

export const STATUS_VARIANT = {
  cancelled: "destructive",
  check_in: "default",
  completed: "secondary",
  confirmed: "default",
  in_progress: "default",
  no_show: "outline",
  pending: "outline",
} as const

export const STATUS_LABEL = {
  cancelled: "Cancelada",
  check_in: "Check-in",
  completed: "Completada",
  confirmed: "Confirmada",
  in_progress: "En progreso",
  no_show: "No se presentó",
  pending: "Pendiente",
} as const

export function statusVariant(status: string) {
  return STATUS_VARIANT[status as keyof typeof STATUS_VARIANT] ?? "outline"
}

export function statusLabel(status: string) {
  return STATUS_LABEL[status as keyof typeof STATUS_LABEL] ?? status
}

export function formatTime(iso: string) {
  return format(new Date(iso), "h:mm a")
}

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  cancelled: [],
  check_in: ["in_progress", "cancelled", "no_show"],
  completed: [],
  confirmed: ["check_in", "cancelled", "no_show"],
  in_progress: ["completed", "cancelled"],
  no_show: [],
  pending: ["confirmed", "cancelled"],
}

type StatusConfig = {
  label: string
  color: string
  icon: typeof Cancel01Icon
}

const STATUS_CONFIG: Record<AppointmentStatus, StatusConfig> = {
  cancelled: { color: "red", icon: Cancel01Icon, label: "Cancelada" },
  check_in: { color: "teal", icon: User02Icon, label: "Check-in" },
  completed: {
    color: "gray",
    icon: CheckmarkCircle01Icon,
    label: "Completada",
  },
  confirmed: { color: "green", icon: Clock01Icon, label: "Confirmada" },
  in_progress: { color: "blue", icon: User02Icon, label: "En progreso" },
  no_show: { color: "amber", icon: UserRemove01Icon, label: "No se presentó" },
  pending: { color: "yellow", icon: Clock01Icon, label: "Pendiente" },
}

const REQUIRES_REASON = new Set<AppointmentStatus>(["cancelled", "no_show"])
const REQUIRES_CONFIRMATION = new Set<AppointmentStatus>([
  "completed",
  "cancelled",
  "no_show",
])

export function getAvailableTransitions(
  status: AppointmentStatus
): AppointmentStatus[] {
  return TRANSITIONS[status]
}

export function getStatusConfig(status: AppointmentStatus): StatusConfig {
  return STATUS_CONFIG[status]
}

export function requiresReason(toStatus: AppointmentStatus): boolean {
  return REQUIRES_REASON.has(toStatus)
}

export function requiresConfirmation(toStatus: AppointmentStatus): boolean {
  return REQUIRES_CONFIRMATION.has(toStatus)
}
