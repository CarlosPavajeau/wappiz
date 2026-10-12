import { describe, expect, it } from "vitest"

import { checkHistory } from "./migrations.ts"
import type { LocalMigration, TrackingTable } from "./migrations.ts"

const first: LocalMigration = {
  folderMillis: 1,
  hash: "a".repeat(64),
  name: "20260101000000_first",
}
const second: LocalMigration = {
  folderMillis: 2,
  hash: "b".repeat(64),
  name: "20260102000000_second",
}

function recorded(entries: [string, string][]): TrackingTable {
  return { kind: "current", recorded: new Map(entries) }
}

describe("checkHistory", () => {
  it("requires a baseline when the table is missing", () => {
    expect(checkHistory([first], { kind: "missing" })).toEqual({
      kind: "not-baselined",
      table: "missing",
    })
  })

  it("requires a baseline for the pre-1.0 layout", () => {
    expect(checkHistory([first], { kind: "legacy" })).toEqual({
      kind: "not-baselined",
      table: "legacy",
    })
  })

  it("passes with nothing pending when every hash matches", () => {
    const table = recorded([
      [first.name, first.hash],
      [second.name, second.hash],
    ])

    expect(checkHistory([first, second], table)).toEqual({
      kind: "ok",
      pending: [],
      unknown: [],
    })
  })

  it("lists unrecorded migrations as pending", () => {
    const table = recorded([[first.name, first.hash]])

    expect(checkHistory([first, second], table)).toEqual({
      kind: "ok",
      pending: [second],
      unknown: [],
    })
  })

  it("blocks when an applied migration changed", () => {
    const table = recorded([[first.name, "c".repeat(64)]])

    expect(checkHistory([first, second], table)).toEqual({
      changed: [first],
      kind: "changed",
      unknown: [],
    })
  })

  it("reports applied migrations missing locally without blocking", () => {
    const table = recorded([
      [first.name, first.hash],
      ["20250101000000_abandoned", "d".repeat(64)],
    ])

    expect(checkHistory([first], table)).toEqual({
      kind: "ok",
      pending: [],
      unknown: ["20250101000000_abandoned"],
    })
  })

  it("still reports missing-locally migrations when blocking", () => {
    const table = recorded([
      [first.name, "c".repeat(64)],
      ["20250101000000_abandoned", "d".repeat(64)],
    ])

    expect(checkHistory([first], table)).toEqual({
      changed: [first],
      kind: "changed",
      unknown: ["20250101000000_abandoned"],
    })
  })
})
