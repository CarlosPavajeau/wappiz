import type { TenantFlowField } from "@wappiz/api-client/types/tenant-flow-fields"
import { type } from "arktype"
import { describe, expect, it } from "vitest"

import {
  defaultValuesFor,
  FIELD_TEMPLATES,
  flowFieldSchema,
  parseBoundInput,
  ruleFormValues,
  toRequest,
} from "@/components/flow-fields/flow-field-form"
import type { FlowFieldFormValues } from "@/components/flow-fields/flow-field-form"
import {
  DEFAULT_TEXT_MAX_LENGTH,
  MAX_NUMBER_LIMIT,
} from "@/components/flow-fields/flow-field-rules"

const validValues: FlowFieldFormValues = {
  ...defaultValuesFor(),
  question: "¿Cuál es tu correo electrónico?",
}

// Returns the paths and messages of a rejected input, or [] when it passes.
function issuesOf(input: unknown): { path: string; message: string }[] {
  const result = flowFieldSchema(input)
  if (!(result instanceof type.errors)) {
    return []
  }
  return result.map((error) => ({
    message: error.message,
    path: error.path.join("."),
  }))
}

const existingField: TenantFlowField = {
  fieldKey: "age",
  id: "field-1",
  isEnabled: true,
  isOneTime: true,
  isRequired: true,
  question: "¿Cuántos años tienes?",
  rule: { minValue: 18, type: "number" },
  sortOrder: 3,
}

describe("flowFieldSchema", () => {
  it("accepts a new text field with its defaults", () => {
    expect(issuesOf(validValues)).toStrictEqual([])
  })

  it("rejects a question shorter than 2 characters", () => {
    expect(issuesOf({ ...validValues, question: "a" })).toStrictEqual([
      {
        message: "La pregunta debe tener entre 2 y 500 caracteres",
        path: "question",
      },
    ])
  })

  it("rejects a negative order", () => {
    expect(issuesOf({ ...validValues, sortOrder: -1 })).toStrictEqual([
      {
        message: "El orden debe ser un numero entero de 0 o mayor",
        path: "sortOrder",
      },
    ])
  })

  it("rejects a text minimum above its maximum", () => {
    expect(
      issuesOf({ ...validValues, textMaxLength: 10, textMinLength: 20 })
    ).toStrictEqual([
      {
        message: "El mínimo no puede ser mayor que el máximo",
        path: "textMinLength",
      },
    ])
  })

  it("rejects an emptied required text bound instead of reading it as 0", () => {
    const issues = issuesOf({
      ...validValues,
      textMaxLength: parseBoundInput("", false),
    })

    expect(issues.map((issue) => issue.path)).toStrictEqual(["textMaxLength"])
  })

  it("ignores inverted text limits when the field is not text", () => {
    expect(
      issuesOf({
        ...validValues,
        fieldType: "email",
        textMaxLength: 10,
        textMinLength: 20,
      })
    ).toStrictEqual([])
  })

  it("accepts a number field without limits", () => {
    expect(
      issuesOf({ ...validValues, ...ruleFormValues({ type: "number" }) })
    ).toStrictEqual([])
  })

  it("rejects a number limit outside the integer range", () => {
    expect(
      issuesOf({
        ...validValues,
        fieldType: "number",
        numberMax: MAX_NUMBER_LIMIT + 1,
      })
    ).toStrictEqual([
      {
        message: "Usa un número entre -2.147.483.648 y 2.147.483.647",
        path: "numberMax",
      },
    ])
  })

  it("rejects a number minimum above its maximum", () => {
    expect(
      issuesOf({
        ...validValues,
        fieldType: "number",
        numberMax: 5,
        numberMin: 10,
      })
    ).toStrictEqual([
      {
        message: "El mínimo no puede ser mayor que el máximo",
        path: "numberMin",
      },
    ])
  })
})

describe("defaultValuesFor", () => {
  it("starts a new field as optional free text asked every time", () => {
    expect(defaultValuesFor()).toStrictEqual({
      fieldType: "text",
      isOneTime: false,
      isRequired: false,
      numberMax: null,
      numberMin: null,
      question: "",
      sortOrder: 0,
      textMaxLength: DEFAULT_TEXT_MAX_LENGTH,
      textMinLength: 0,
    })
  })

  it("loads an existing field and leaves a missing bound empty", () => {
    expect(defaultValuesFor(existingField)).toStrictEqual({
      fieldType: "number",
      isOneTime: true,
      isRequired: true,
      numberMax: null,
      numberMin: 18,
      question: "¿Cuántos años tienes?",
      sortOrder: 3,
      textMaxLength: DEFAULT_TEXT_MAX_LENGTH,
      textMinLength: 0,
    })
  })
})

describe("ruleFormValues", () => {
  it("resets the limits of the types not selected", () => {
    expect(ruleFormValues({ type: "email" })).toStrictEqual({
      fieldType: "email",
      numberMax: null,
      numberMin: null,
      textMaxLength: DEFAULT_TEXT_MAX_LENGTH,
      textMinLength: 0,
    })
  })
})

describe("toRequest", () => {
  it("trims the question", () => {
    expect(
      toRequest({ ...validValues, question: "  ¿Tu nombre?  " }).question
    ).toBe("¿Tu nombre?")
  })

  it("keeps only the limits of the selected type", () => {
    const request = toRequest({
      ...validValues,
      fieldType: "email",
      numberMin: 1,
      textMaxLength: 50,
    })

    expect(request.rule).toStrictEqual({ type: "email" })
  })

  it("omits number bounds left empty", () => {
    const request = toRequest({
      ...validValues,
      fieldType: "number",
      numberMax: 99,
      numberMin: null,
    })

    expect(request.rule).toStrictEqual({ maxValue: 99, type: "number" })
  })

  it("sends back an existing field unchanged when nothing was edited", () => {
    expect(toRequest(defaultValuesFor(existingField))).toStrictEqual({
      isOneTime: existingField.isOneTime,
      isRequired: existingField.isRequired,
      question: existingField.question,
      rule: existingField.rule,
      sortOrder: existingField.sortOrder,
    })
  })
})

describe("FIELD_TEMPLATES", () => {
  it.each(FIELD_TEMPLATES)(
    "$label fills a form that saves its own rule",
    (template) => {
      const values: FlowFieldFormValues = {
        ...defaultValuesFor(),
        ...ruleFormValues(template.rule),
        isOneTime: template.isOneTime,
        isRequired: template.isRequired,
        question: template.question,
      }

      expect(issuesOf(values)).toStrictEqual([])
      expect(toRequest(values).rule).toStrictEqual(template.rule)
    }
  )
})

describe("parseBoundInput", () => {
  it("reads an empty optional bound as no limit", () => {
    expect(parseBoundInput("", true)).toBeNull()
  })

  it("keeps an empty required bound as empty", () => {
    expect(parseBoundInput("", false)).toBe("")
  })

  it("parses a typed number", () => {
    expect(parseBoundInput("-15", true)).toBe(-15)
  })
})
