// Shared helpers for the scripts that inspect drizzle's migrations tracking
// table (baseline-migrations.ts, check-migrations.ts).

import path from "node:path"

import { readMigrationFiles } from "drizzle-orm/migrator"
import type { Client } from "pg"

export const MIGRATIONS_SCHEMA = "drizzle"
export const MIGRATIONS_TABLE = "__drizzle_migrations"
export const TABLE = `"${MIGRATIONS_SCHEMA}"."${MIGRATIONS_TABLE}"`

// Folder names and sha256 hex digests are the only values the baseline script
// interpolates into SQL; rejecting anything else keeps quoting a non-issue.
const MIGRATION_NAME = /^\d{14}_[a-z0-9_]+$/u
const SHA256_HEX = /^[0-9a-f]{64}$/u

export type LocalMigration = {
  name: string
  hash: string
  folderMillis: number
}

// Version 0 is drizzle's pre-1.0 layout (id, hash, created_at); version 1
// adds `name` and `applied_at`, and is what the current migrator expects.
// `recorded` maps each recorded migration name to its hash.
export type TrackingTable =
  | { kind: "missing" }
  | { kind: "legacy" }
  | { kind: "current"; recorded: ReadonlyMap<string, string> }

// Read directly instead of through drizzle.config.ts, which falls back to the
// production URL in apps/web/.env when DATABASE_URL is unset.
export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL must be set explicitly")
  }
  return url
}

// Reuses drizzle's own reader so names, hashes and timestamps match exactly
// what the migrator computes.
export function readLocalMigrations(): LocalMigration[] {
  const files = readMigrationFiles({
    migrationsFolder: path.join(import.meta.dirname, "..", "src", "migrations"),
  })
  return files.map(({ name, hash, folderMillis }) => {
    if (!name || !MIGRATION_NAME.test(name) || !SHA256_HEX.test(hash)) {
      throw new Error(`Unexpected migration folder: ${name ?? "<unnamed>"}`)
    }
    return { folderMillis, hash, name }
  })
}

export async function inspectTrackingTable(
  client: Client
): Promise<TrackingTable> {
  const columns = await client.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2`,
    [MIGRATIONS_SCHEMA, MIGRATIONS_TABLE]
  )
  if (columns.rows.length === 0) {
    return { kind: "missing" }
  }
  if (!columns.rows.some((c) => c.column_name === "name")) {
    return { kind: "legacy" }
  }

  const rows = await client.query<{ name: string; hash: string }>(
    `SELECT name, hash FROM ${TABLE} WHERE name IS NOT NULL`
  )
  return {
    kind: "current",
    recorded: new Map(rows.rows.map((r) => [r.name, r.hash])),
  }
}

// What the deploy pipeline must know about the database's migration history
// before running `drizzle-kit migrate`:
// - not-baselined: no table, or the pre-1.0 layout; migrate would re-run
//   every migration.
// - changed: migrations whose file changed after they were applied. Drizzle
//   matches by name, so it would silently keep the old version.
// - ok: safe to migrate; `pending` will be applied.
// `unknown` lists applied migrations missing locally (usually an abandoned
// branch deployed to staging): worth reporting, never blocking.
export type HistoryCheck =
  | { kind: "not-baselined"; table: "missing" | "legacy" }
  | { kind: "changed"; changed: LocalMigration[]; unknown: string[] }
  | { kind: "ok"; pending: LocalMigration[]; unknown: string[] }

export function checkHistory(
  local: readonly LocalMigration[],
  table: TrackingTable
): HistoryCheck {
  if (table.kind !== "current") {
    return { kind: "not-baselined", table: table.kind }
  }

  const localNames = new Set(local.map((m) => m.name))
  const unknown = [...table.recorded.keys()].filter(
    (name) => !localNames.has(name)
  )
  const changed = local.filter((m) => {
    const hash = table.recorded.get(m.name)
    return hash !== undefined && hash !== m.hash
  })
  if (changed.length > 0) {
    return { changed, kind: "changed", unknown }
  }

  const pending = local.filter((m) => !table.recorded.has(m.name))
  return { kind: "ok", pending, unknown }
}
