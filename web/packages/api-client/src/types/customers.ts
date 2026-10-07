export type Customer = {
  id: string
  phoneNumber: string
  name: string | null
  displayName: string
  isBlocked: boolean
  noShowCount: number
  lateCancelCount: number
  appointmentCount: number
}

export type CustomerStatus = "active" | "blocked"

/** Every filter is optional; `phone` is matched on its digits only. */
export type ListCustomersParams = {
  name?: string
  phone?: string
  status?: CustomerStatus
  page?: number
  limit?: number
}

export type CustomerPage = {
  customers: Customer[]
  total: number
}

export type IncidentEventType = "no_show" | "late_cancel"

export type Incident = {
  id: string
  eventType: IncidentEventType
  appointmentId: string
  startsAt: string
  occurredAt: string
  serviceName: string
  resourceName: string
}
