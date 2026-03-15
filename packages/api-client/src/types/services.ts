export type Service = {
  id: string
  name: string
  description?: string
  durationMinutes: number
  bufferMinutes: number
  totalMinutes: number
  price: number
  sortOrder: number
}

export type CreateServiceRequest = {
  name: string
  description?: string
  durationMinutes: number
  bufferMinutes: number
  price: number
}
