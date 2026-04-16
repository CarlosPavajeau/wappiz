export type WorkingHour = {
  id: string
  dayOfWeek: number
  dayName: string
  startTime: string
  endTime: string
  isActive: boolean
}

export type Resource = {
  id: string
  name: string
  type: string
  avatarUrl: string
  isActive: boolean
  sortOrder: number
  workingHours: WorkingHour[]
}

export type CreateResourceRequest = {
  name: string
  type: string
  avatarURL?: string
}

export type AssignServicesRequest = {
  serviceIds: string[]
}

export type UpdateWorkingHoursRequest = {
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
}

export type ScheduleOverride = {
  id: string
  date: string
  isDayOff: boolean
  startTime?: string
  endTime?: string
  reason: string
}

export type CreateScheduleOverrideRequest = {
  date: string
  isDayOff: boolean
  startTime?: string
  endTime?: string
  reason: string
}

export type DeleteScheduleOverrideRequest = {
  resourceId: string
  overrideId: string
}

export type UpdateResourceRequest = {
  name: string
  type: string
  avatarURL?: string
}
