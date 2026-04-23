export type MetadataOutputType = string | number | number | boolean

export function parsePlanMetadata(
  metadata: Record<string, MetadataOutputType>
) {
  return {
    featureAnalytics: parseBool(metadata.feature_analytics as string),
    featureBasicReminders: parseBool(
      metadata.feature_basic_reminders as string
    ),
    featureCustomReminders: parseBool(
      metadata.feature_custom_reminders as string
    ),
    featureMultiLocation: parseBool(metadata.feature_multi_location as string),
    featurePrioritySupport: parseBool(
      metadata.feature_priority_support as string
    ),
    featurePublicBooking: parseBool(metadata.feature_public_booking as string),
    featureRecurring: parseBool(metadata.feature_recurring as string),
    featureWaitingList: parseBool(metadata.feature_waiting_list as string),
    maxAppointmentsPerMonth: parseNumber(
      metadata.max_appointments_per_month as string
    ),
    maxResources: parseNumber(metadata.max_resources as string),
    maxServices: parseNumber(metadata.max_services as string),
  }
}

function parseBool(value: string | undefined): boolean {
  return value === "true"
}

function parseNumber(value: string | undefined): number | null {
  if (!value || value.trim() === "") {
    return null
  }

  const parsed = Number.parseInt(value, 10)

  return Number.isNaN(parsed) ? null : parsed
}
