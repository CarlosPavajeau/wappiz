export type MetadataOutputType = string | number | number | boolean

export function parsePlanMetadata(
  metadata: Record<string, MetadataOutputType>
) {
  return {
    ...metadata,
    feature_analytics: parseBool(metadata.feature_analytics as string),
  }
}

function parseBool(value: string): boolean {
  return value === "true"
}
