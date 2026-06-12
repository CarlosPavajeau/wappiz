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

export type WorkingHoursInterval = {
  startTime: string
  endTime: string
}

export type WorkingHoursDay = {
  dayOfWeek: number
  intervals: WorkingHoursInterval[]
}

export type UpdateWorkingHoursRequest = {
  days: WorkingHoursDay[]
}

export type ScheduleOverrideKind = "time_off" | "custom_hours"

export type ScheduleOverride = {
  id: string
  kind: ScheduleOverrideKind
  startDate: string
  endDate: string
  startTime?: string
  endTime?: string
  reason: string
}

export type CreateScheduleOverrideRequest = {
  kind: ScheduleOverrideKind
  startDate: string
  endDate: string
  startTime?: string
  endTime?: string
  reason: string
}

export type OverrideConflict = {
  appointmentId: string
  startsAt: string
  endsAt: string
  customerName: string
  serviceName: string
}

export type CreateScheduleOverrideResponse = {
  id: string
  conflicts: OverrideConflict[]
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
