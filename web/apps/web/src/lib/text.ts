/** Case- and accent-insensitive comparison key ("Jose" matches "José"). */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[̀-ͯ]/gu, "")
    .toLowerCase()
    .trim()
}

/** Whether `text` contains `query`, ignoring case and accents. */
export function includesText(text: string, query: string): boolean {
  return normalizeText(text).includes(normalizeText(query))
}
