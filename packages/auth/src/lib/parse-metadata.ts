export type MetadataOutputType = string | number | number | boolean

export function parsePlanMetadata(
  metadata: Record<string, MetadataOutputType>
) {
  return {
    ...metadata,
    feature_analytics: parseBool(metadata.feature_analytics as string),
    max_services: parseNumber(metadata.max_services as string),
  }
}

function parseBool(value: string): boolean {
  return value === "true"
}

function parseNumber(value: string): number | null {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) {
    return null
  }

  return parsed
}
