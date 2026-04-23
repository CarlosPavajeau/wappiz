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
