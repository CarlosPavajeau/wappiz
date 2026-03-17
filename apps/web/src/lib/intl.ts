export const priceFormatter = new Intl.NumberFormat("es-CO", {
  currency: "COP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
})
