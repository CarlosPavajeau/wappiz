export type Customer = {
  id: string
  phoneNumber: string
  name: string
  displayName: string
  isBlocked: boolean
  noShowCount: number
  lateCancelCount: number
  appointmentCount: number
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
