import { useState } from "react"
import { describe, expect, it } from "vitest"
import { render } from "vitest-browser-react"
import { page } from "vitest/browser"

import {
  FILTER_SEARCH_THRESHOLD,
  FilterChecklist,
} from "@/components/appointments/filter-checklist"
import type { FilterItem } from "@/components/appointments/filter-checklist"

const NAMES = [
  "José Pérez",
  "Ana Gómez",
  "Luis Díaz",
  "María López",
  "Carlos Ruiz",
  "Sofía Torres",
  "Pedro Rojas",
  "Laura Vargas",
  "Andrés Castro",
]

const many: FilterItem[] = NAMES.map((label, i) => ({ id: `r${i}`, label }))
const few = many.slice(0, FILTER_SEARCH_THRESHOLD)

function Harness({ items }: { items: FilterItem[] }) {
  const [selected, setSelected] = useState<string[]>([])
  return (
    <FilterChecklist
      items={items}
      label="Recursos"
      selectedIds={selected}
      onSelectedIdsChange={setSelected}
    />
  )
}

describe("FilterChecklist", () => {
  it("hides the search box for short lists", async () => {
    await render(<Harness items={few} />)

    await expect
      .element(page.getByRole("checkbox", { name: "José Pérez" }))
      .toBeVisible()
    expect(
      page.getByRole("searchbox", { name: "Buscar recursos" }).query()
    ).toBeNull()
  })

  it("filters long lists ignoring accents and case", async () => {
    await render(<Harness items={many} />)

    await page.getByRole("searchbox", { name: "Buscar recursos" }).fill("JOSE")

    await expect
      .element(page.getByRole("checkbox", { name: "José Pérez" }))
      .toBeVisible()
    expect(page.getByRole("checkbox").all()).toHaveLength(1)
  })

  it("keeps selections hidden by the search", async () => {
    await render(<Harness items={many} />)

    await page.getByRole("checkbox", { name: "Ana Gómez" }).click()
    const search = page.getByRole("searchbox", { name: "Buscar recursos" })
    await search.fill("luis")
    await search.fill("")

    await expect
      .element(page.getByRole("checkbox", { name: "Ana Gómez" }))
      .toBeChecked()
  })

  it("says when nothing matches", async () => {
    await render(<Harness items={many} />)

    await page.getByRole("searchbox", { name: "Buscar recursos" }).fill("zzz")

    await expect.element(page.getByText("Sin resultados")).toBeVisible()
  })
})
