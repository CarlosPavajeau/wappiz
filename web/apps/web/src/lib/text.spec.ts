import { describe, expect, it } from "vitest"

import { includesText, normalizeText } from "@/lib/text"

describe("normalizeText", () => {
  it("drops accents, case and surrounding spaces", () => {
    expect(normalizeText("  José Ñandú ")).toBe("jose nandu")
  })
})

describe("includesText", () => {
  it("matches regardless of accents and case", () => {
    expect(includesText("Corte de cabello", "CABELLO")).toBe(true)
    expect(includesText("José", "jose")).toBe(true)
    expect(includesText("jose", "José")).toBe(true)
  })

  it("treats an empty query as a match", () => {
    expect(includesText("Manicure", "  ")).toBe(true)
  })

  it("rejects text that does not contain the query", () => {
    expect(includesText("Manicure", "pedi")).toBe(false)
  })
})
