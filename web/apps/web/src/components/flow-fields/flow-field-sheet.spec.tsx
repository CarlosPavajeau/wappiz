import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { TenantFlowField } from "@wappiz/api-client/types/tenant-flow-fields"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render } from "vitest-browser-react"
import { page } from "vitest/browser"

import { FlowFieldSheet } from "@/components/flow-fields/flow-field-sheet"

const mocks = vi.hoisted(() => ({
  create: vi.fn<(request: unknown) => Promise<void>>(),
  invalidate: vi.fn<() => Promise<void>>(),
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string) => void>(),
  update: vi.fn<(id: string, request: unknown) => Promise<void>>(),
}))

vi.mock("@/lib/client-api", () => ({
  api: {
    tenantFlowFields: { create: mocks.create, update: mocks.update },
  },
}))
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ invalidate: mocks.invalidate }),
}))
vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}))

const existingField: TenantFlowField = {
  fieldKey: "age",
  id: "field-1",
  isEnabled: true,
  isOneTime: false,
  isRequired: true,
  question: "¿Cuántos años tienes?",
  rule: { minValue: 18, type: "number" },
  sortOrder: 2,
}

async function renderSheet(field?: TenantFlowField) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return await render(
    <QueryClientProvider client={queryClient}>
      <FlowFieldSheet field={field} />
    </QueryClientProvider>
  )
}

const sheet = () => page.getByRole("dialog")
const question = () => page.getByLabelText("Pregunta")

describe("FlowFieldSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue()
    mocks.update.mockResolvedValue()
    mocks.invalidate.mockResolvedValue()
  })

  it("creates a field from a template", async () => {
    await renderSheet()

    await page.getByRole("button", { name: "Nuevo campo" }).click()
    await page.getByRole("button", { name: "Correo electrónico" }).click()

    await expect
      .element(question())
      .toHaveValue("¿Cuál es tu correo electrónico?")

    await page.getByRole("button", { name: "Crear campo" }).click()

    await expect
      .poll(() => mocks.create)
      .toHaveBeenCalledWith({
        isOneTime: true,
        isRequired: false,
        question: "¿Cuál es tu correo electrónico?",
        rule: { type: "email" },
        sortOrder: 0,
      })
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Campo creado")
    expect(mocks.invalidate).toHaveBeenCalledOnce()
    await expect.element(sheet()).not.toBeInTheDocument()
  })

  it("shows the validation error and does not save a blank question", async () => {
    await renderSheet()

    await page.getByRole("button", { name: "Nuevo campo" }).click()
    await page.getByRole("button", { name: "Crear campo" }).click()

    await expect
      .element(
        page.getByText("La pregunta debe tener entre 2 y 500 caracteres")
      )
      .toBeVisible()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it("asks for text limits or a number range depending on the type", async () => {
    await renderSheet()

    await page.getByRole("button", { name: "Nuevo campo" }).click()
    await expect
      .element(page.getByText("Longitud de la respuesta (caracteres)"))
      .toBeVisible()

    await page.getByRole("button", { name: "Celular alterno" }).click()

    await expect
      .element(page.getByText("Longitud de la respuesta (caracteres)"))
      .not.toBeInTheDocument()
    await expect
      .element(page.getByText("Rango permitido (opcional)"))
      .not.toBeInTheDocument()
  })

  it("updates an existing field with the edited question", async () => {
    await renderSheet(existingField)

    await page.getByRole("button", { name: "Editar campo" }).click()
    await expect.element(question()).toHaveValue(existingField.question)
    await expect
      .element(page.getByText("Rango permitido (opcional)"))
      .toBeVisible()

    await question().fill("¿Qué edad tienes?")
    await page.getByRole("button", { name: "Guardar cambios" }).click()

    await expect
      .poll(() => mocks.update)
      .toHaveBeenCalledWith("field-1", {
        isOneTime: false,
        isRequired: true,
        question: "¿Qué edad tienes?",
        rule: { minValue: 18, type: "number" },
        sortOrder: 2,
      })
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Campo actualizado")
  })

  it("discards unsaved edits when cancelled", async () => {
    await renderSheet()

    await page.getByRole("button", { name: "Nuevo campo" }).click()
    await question().fill("Pregunta a medias")
    await page.getByRole("button", { name: "Cancelar" }).click()
    await expect.element(sheet()).not.toBeInTheDocument()

    await page.getByRole("button", { name: "Nuevo campo" }).click()

    await expect.element(question()).toHaveValue("")
  })

  it("keeps the sheet open when saving fails", async () => {
    mocks.create.mockRejectedValue(new Error("network down"))
    await renderSheet()

    await page.getByRole("button", { name: "Nuevo campo" }).click()
    await question().fill("¿Cuál es tu nombre?")
    await page.getByRole("button", { name: "Crear campo" }).click()

    await expect
      .poll(() => mocks.toastError)
      .toHaveBeenCalledWith(
        "No se pudo guardar el campo. Revisa los datos e intenta de nuevo."
      )
    await expect.element(sheet()).toBeVisible()
    expect(mocks.invalidate).not.toHaveBeenCalled()
  })
})
