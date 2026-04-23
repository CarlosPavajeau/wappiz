export type MetadataOutputType = string | number | number | boolean

export function parsePlanMetadata(
  metadata: Record<string, MetadataOutputType>
) {
  return {
    feature_analytics: parseBool(metadata.feature_analytics as string),
    feature_basic_reminders: parseBool(
      metadata.feature_basic_reminders as string
    ),
    feature_custom_reminders: parseBool(
      metadata.feature_custom_reminders as string
    ),
    feature_multi_location: parseBool(
      metadata.feature_multi_location as string
    ),
    feature_priority_support: parseBool(
      metadata.feature_priority_support as string
    ),
    feature_public_booking: parseBool(
      metadata.feature_public_booking as string
    ),
    feature_recurring: parseBool(metadata.feature_recurring as string),
    feature_waiting_list: parseBool(metadata.feature_waiting_list as string),
    max_appointments_per_month: parseNumber(
      metadata.max_appointments_per_month as string
    ),
    max_resources: parseNumber(metadata.max_resources as string),
    max_services: parseNumber(metadata.max_services as string),
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
