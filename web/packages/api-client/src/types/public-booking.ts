export type PublicService = {
  id: string
  name: string
  description: string
  durationMinutes: number
  price: number
}

export type PublicResource = {
  id: string
  name: string
  avatarUrl: string
  serviceIds: string[]
}

export type PublicTenant = {
  name: string
  slug: string
  timezone: string
  currency: string
  services: PublicService[]
  resources: PublicResource[]
  /** How many days ahead availability can be queried */
  bookingWindowDays: number
}

export type AvailabilityParams = {
  slug: string
  serviceId: string
  /** Omit to get slots for any resource offering the service */
  resourceId?: string
  /** Day in the tenant's timezone, formatted as YYYY-MM-DD */
  date: string
}

export type AvailableSlot = {
  startsAt: string
  endsAt: string
  resourceId: string
  resourceName: string
}

export type BookAppointmentRequest = {
  serviceId: string
  resourceId: string
  startsAt: string
  customerName: string
  phoneNumber: string
  turnstileToken: string
}

export type BookAppointmentResponse = {
  id: string
  startsAt: string
  endsAt: string
  serviceName: string
  resourceName: string
}
