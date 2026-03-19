export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"

export type CancelledBy = "customer" | "business"

export type Appointment = {
  id: string
  resourceName: string
  serviceName: string
  customerName: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  priceAtBooking: number
  checked_in_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancelled_by: CancelledBy | null
  cancel_reason: string | null
  no_show_at: string | null
  no_show_reason: string | null
}

export type UpdateAppointmentStatusRequest = {
  status: AppointmentStatus
  reason?: string | null
  cancelled_by?: CancelledBy | null
}
