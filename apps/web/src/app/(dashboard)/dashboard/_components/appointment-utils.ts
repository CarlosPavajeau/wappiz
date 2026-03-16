import { format } from "date-fns"

export const STATUS_VARIANT = {
  cancelled: "destructive",
  confirmed: "default",
  pending: "outline",
} as const

export const STATUS_LABEL = {
  cancelled: "Cancelada",
  confirmed: "Confirmada",
  pending: "Pendente",
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
