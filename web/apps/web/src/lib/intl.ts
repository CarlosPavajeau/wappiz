export const priceFormatter = new Intl.NumberFormat("es-CO", {
  currency: "COP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
})

export function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("es-CO", {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value)
}

const COLOMBIA_DIAL_CODE = "57"
const COLOMBIA_NATIONAL_LENGTH = 10

/**
 * Formats a phone number for display using Colombian conventions:
 * `+57 300 123 4567`. Numbers arrive from WhatsApp as bare digits with the
 * country code (`573001234567`); a 10-digit national number is assumed to be
 * Colombian. Anything else is returned with a `+` prefix and no grouping,
 * since guessing a foreign layout would be worse than none.
 */
export function formatPhoneNumber(value: string): string {
  const digits = value.replaceAll(/\D/gu, "")
  if (digits === "") {
    return value
  }

  const national = toColombianNational(digits)
  if (national === null) {
    return `+${digits}`
  }

  return `+${COLOMBIA_DIAL_CODE} ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`
}

/**
 * Parses what a customer typed as a Colombian mobile number, returning its
 * 10 national digits (`3001234567`) or `null`. Spaces, dashes and a leading
 * `+57`/`57` are tolerated because autofill and pasted numbers carry them.
 * Only mobiles (starting with 3) qualify: the number must reach WhatsApp.
 */
export function parseColombianMobile(value: string): string | null {
  const national = toColombianNational(value.replaceAll(/\D/gu, ""))
  return national?.startsWith("3") ? national : null
}

function toColombianNational(digits: string): string | null {
  if (digits.length === COLOMBIA_NATIONAL_LENGTH) {
    return digits
  }
  if (
    digits.startsWith(COLOMBIA_DIAL_CODE) &&
    digits.length === COLOMBIA_DIAL_CODE.length + COLOMBIA_NATIONAL_LENGTH
  ) {
    return digits.slice(COLOMBIA_DIAL_CODE.length)
  }
  return null
}
