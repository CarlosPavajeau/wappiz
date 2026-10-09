import type {
  FlowFieldRule,
  TenantFlowField,
  UpsertTenantFlowFieldRequest,
} from "@wappiz/api-client/types/tenant-flow-fields"
import { type } from "arktype"

import {
  DEFAULT_TEXT_MAX_LENGTH,
  defaultRuleFor,
  FLOW_FIELD_TYPES,
  MAX_NUMBER_LIMIT,
  MAX_QUESTION_LENGTH,
  MAX_TEXT_LENGTH,
  MIN_NUMBER_LIMIT,
} from "@/components/flow-fields/flow-field-rules"

// The form holds every type's limits as flat fields because react-hook-form
// works best with a fixed shape; toRule() keeps only the selected type's.
export const flowFieldSchema = type({
  fieldType: type.enumerated(...FLOW_FIELD_TYPES),
  isOneTime: "boolean",
  isRequired: "boolean",
  numberMax: "number.integer | null",
  numberMin: "number.integer | null",
  question: type(`2 <= string <= ${MAX_QUESTION_LENGTH}`).configure({
    message: `La pregunta debe tener entre 2 y ${MAX_QUESTION_LENGTH} caracteres`,
  }),
  sortOrder: type("number.integer >= 0").configure({
    message: "El orden debe ser un numero entero de 0 o mayor",
  }),
  textMaxLength: type(`1 <= number.integer <= ${MAX_TEXT_LENGTH}`).configure({
    message: `El máximo debe ser un entero entre 1 y ${MAX_TEXT_LENGTH}`,
  }),
  textMinLength: type(`0 <= number.integer <= ${MAX_TEXT_LENGTH}`).configure({
    message: `El mínimo debe ser un entero entre 0 y ${MAX_TEXT_LENGTH}`,
  }),
}).narrow((data, ctx) => {
  if (data.fieldType === "text" && data.textMinLength > data.textMaxLength) {
    return ctx.reject({
      message: "El mínimo no puede ser mayor que el máximo",
      path: ["textMinLength"],
    })
  }
  // A union ignores `.configure()`, so the integer range of the optional
  // number bounds is checked here with its own message.
  const outOfRange = (["numberMin", "numberMax"] as const).find((key) => {
    const value = data[key]
    return (
      data.fieldType === "number" &&
      value !== null &&
      (value < MIN_NUMBER_LIMIT || value > MAX_NUMBER_LIMIT)
    )
  })
  if (outOfRange !== undefined) {
    return ctx.reject({
      message: `Usa un número entre ${MIN_NUMBER_LIMIT.toLocaleString("es-CO")} y ${MAX_NUMBER_LIMIT.toLocaleString("es-CO")}`,
      path: [outOfRange],
    })
  }
  if (
    data.fieldType === "number" &&
    data.numberMin !== null &&
    data.numberMax !== null &&
    data.numberMin > data.numberMax
  ) {
    return ctx.reject({
      message: "El mínimo no puede ser mayor que el máximo",
      path: ["numberMin"],
    })
  }
  return true
})

export type FlowFieldFormValues = typeof flowFieldSchema.infer

type RuleFormValues = Pick<
  FlowFieldFormValues,
  "fieldType" | "numberMax" | "numberMin" | "textMaxLength" | "textMinLength"
>

type FieldTemplate = {
  label: string
  description: string
  question: string
  rule: FlowFieldRule
  isOneTime: boolean
  isRequired: boolean
}

// Starting points offered when creating a field; picking one only pre-fills
// the form. Data that rarely changes is asked once per customer by default.
export const FIELD_TEMPLATES: FieldTemplate[] = [
  {
    description: "Cédula u otro documento del cliente",
    isOneTime: true,
    isRequired: true,
    label: "Documento de identidad",
    question: "¿Cuál es tu número de documento?",
    rule: { type: "document" },
  },
  {
    description: "Por qué el cliente agenda la cita",
    isOneTime: false,
    isRequired: false,
    label: "Motivo de la visita",
    question: "¿Cuál es el motivo de tu visita?",
    rule: { maxLength: 280, minLength: 3, type: "text" },
  },
  {
    description: "Correo de contacto del cliente",
    isOneTime: true,
    isRequired: false,
    label: "Correo electrónico",
    question: "¿Cuál es tu correo electrónico?",
    rule: { type: "email" },
  },
  {
    description: "Otro número de contacto del cliente",
    isOneTime: true,
    isRequired: false,
    label: "Celular alterno",
    question: "¿Tienes otro número de celular donde podamos contactarte?",
    rule: { type: "phone" },
  },
  {
    description: "Dirección de residencia del cliente",
    isOneTime: true,
    isRequired: false,
    label: "Dirección",
    question: "¿Cuál es tu dirección?",
    rule: { maxLength: 200, minLength: 5, type: "text" },
  },
  {
    description: "Fecha de nacimiento del cliente",
    isOneTime: true,
    isRequired: false,
    label: "Fecha de nacimiento",
    question: "¿Cuál es tu fecha de nacimiento?",
    rule: { type: "date" },
  },
]

// Limits of the types not selected are reset to their defaults, so a hidden
// input can never hold a value that blocks submitting.
export function ruleFormValues(rule: FlowFieldRule): RuleFormValues {
  const values: RuleFormValues = {
    fieldType: rule.type,
    numberMax: null,
    numberMin: null,
    textMaxLength: DEFAULT_TEXT_MAX_LENGTH,
    textMinLength: 0,
  }
  if (rule.type === "text") {
    return {
      ...values,
      textMaxLength: rule.maxLength,
      textMinLength: rule.minLength,
    }
  }
  if (rule.type === "number") {
    return {
      ...values,
      numberMax: rule.maxValue ?? null,
      numberMin: rule.minValue ?? null,
    }
  }
  return values
}

export function defaultValuesFor(field?: TenantFlowField): FlowFieldFormValues {
  return {
    ...ruleFormValues(field?.rule ?? defaultRuleFor("text")),
    isOneTime: field?.isOneTime ?? false,
    isRequired: field?.isRequired ?? false,
    question: field?.question ?? "",
    sortOrder: field?.sortOrder ?? 0,
  }
}

function toRule(values: RuleFormValues): FlowFieldRule {
  if (values.fieldType === "text") {
    return {
      maxLength: values.textMaxLength,
      minLength: values.textMinLength,
      type: "text",
    }
  }
  if (values.fieldType === "number") {
    return {
      type: "number",
      ...(values.numberMin === null ? {} : { minValue: values.numberMin }),
      ...(values.numberMax === null ? {} : { maxValue: values.numberMax }),
    }
  }
  return { type: values.fieldType }
}

export function toRequest(
  values: FlowFieldFormValues
): UpsertTenantFlowFieldRequest {
  return {
    isOneTime: values.isOneTime,
    isRequired: values.isRequired,
    question: values.question.trim(),
    rule: toRule(values),
    sortOrder: values.sortOrder,
  }
}

// An empty optional bound means "no limit". An empty required bound is kept
// as "" so the schema reports it instead of silently turning it into 0.
export function parseBoundInput(
  value: string,
  optional: boolean
): number | "" | null {
  if (value === "") {
    return optional ? null : ""
  }
  return Number(value)
}
