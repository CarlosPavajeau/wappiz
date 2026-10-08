import type {
  FlowFieldRule,
  FlowFieldType,
} from "@wappiz/api-client/types/tenant-flow-fields"

// Mirrors the limits enforced by the API (pkg/flowfield) and the database.
export const MAX_QUESTION_LENGTH = 500
export const MAX_TEXT_LENGTH = 1000
export const DEFAULT_TEXT_MAX_LENGTH = 280
// Number limits are stored as Postgres integers.
export const MIN_NUMBER_LIMIT = -2_147_483_648
export const MAX_NUMBER_LIMIT = 2_147_483_647

export const FLOW_FIELD_TYPES = [
  "text",
  "email",
  "document",
  "phone",
  "date",
  "number",
] as const satisfies readonly FlowFieldType[]

export const isFlowFieldType = (value: unknown): value is FlowFieldType =>
  FLOW_FIELD_TYPES.some((fieldType) => fieldType === value)

export const FLOW_FIELD_TYPE_LABELS: Record<FlowFieldType, string> = {
  date: "Fecha",
  document: "Documento de identidad",
  email: "Correo electrónico",
  number: "Número",
  phone: "Celular",
  text: "Texto libre",
}

export const FLOW_FIELD_TYPE_DESCRIPTIONS: Record<FlowFieldType, string> = {
  date: "Una fecha en formato DD/MM/AAAA, desde 1900 hasta hoy. No acepta fechas futuras.",
  document:
    "Entre 5 y 15 dígitos. Se quitan los puntos, espacios y guiones que escriba el cliente.",
  email: "Un correo válido, guardado en minúsculas.",
  number: "Un número entero, opcionalmente dentro de un rango.",
  phone: "Un celular colombiano de 10 dígitos.",
  text: "Respuesta abierta. Limita su longitud para que el cliente no envíe más de lo necesario.",
}

export function defaultRuleFor(fieldType: FlowFieldType): FlowFieldRule {
  if (fieldType === "text") {
    return { maxLength: DEFAULT_TEXT_MAX_LENGTH, minLength: 0, type: "text" }
  }
  return { type: fieldType }
}

function describeRange(
  minValue: number | undefined,
  maxValue: number | undefined
): string | undefined {
  if (minValue !== undefined && maxValue !== undefined) {
    return `${minValue} a ${maxValue}`
  }
  if (minValue !== undefined) {
    return `desde ${minValue}`
  }
  if (maxValue !== undefined) {
    return `hasta ${maxValue}`
  }
  return undefined
}

export function describeRule(rule: FlowFieldRule): string {
  const label = FLOW_FIELD_TYPE_LABELS[rule.type]
  if (rule.type === "text") {
    return `${label} · máx. ${rule.maxLength}`
  }
  if (rule.type === "number") {
    const range = describeRange(rule.minValue, rule.maxValue)
    return range === undefined ? label : `${label} · ${range}`
  }
  return label
}
