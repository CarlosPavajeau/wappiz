// Prints the SQL that records already-applied migrations in drizzle's
// tracking table without executing them. Migrations were applied to
// production by hand, so `drizzle.__drizzle_migrations` lags behind
// `src/migrations`; drizzle decides what to run by folder name, so
// `drizzle-kit migrate` would re-run every unrecorded migration.
//
// The script only reads from the database. Review its output, confirm the
// schema already matches (e.g. `drizzle-kit push --verbose` reports no
// changes), and apply it yourself. Run it against a branch before prod.
//
// Usage: DATABASE_URL=... node scripts/baseline-migrations.ts > baseline.sql

import path from "node:path"

import { readMigrationFiles } from "drizzle-orm/migrator"
import { Client } from "pg"

const MIGRATIONS_SCHEMA = "drizzle"
const MIGRATIONS_TABLE = "__drizzle_migrations"
const TABLE = `"${MIGRATIONS_SCHEMA}"."${MIGRATIONS_TABLE}"`

// Folder names and sha256 hex digests are the only values interpolated into
// the emitted SQL; rejecting anything else keeps quoting a non-issue.
const MIGRATION_NAME = /^\d{14}_[a-z0-9_]+$/u
const SHA256_HEX = /^[0-9a-f]{64}$/u

// Version 0 is drizzle's pre-1.0 layout (id, hash, created_at); version 1
// adds `name` and `applied_at`, and is what the current migrator expects.
type TrackingTable =
  | { kind: "missing" }
  | { kind: "legacy" }
  | { kind: "current"; recorded: ReadonlySet<string> }

async function inspectTrackingTable(client: Client): Promise<TrackingTable> {
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

  const rows = await client.query<{ name: string }>(
    `SELECT name FROM ${TABLE} WHERE name IS NOT NULL`
  )
  return { kind: "current", recorded: new Set(rows.rows.map((r) => r.name)) }
}

function preamble(table: TrackingTable): string[] {
  switch (table.kind) {
    case "missing": {
      return [
        `CREATE SCHEMA IF NOT EXISTS "${MIGRATIONS_SCHEMA}";`,
        `CREATE TABLE IF NOT EXISTS ${TABLE} (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint,
  name text,
  applied_at timestamp with time zone DEFAULT now()
);`,
      ]
    }
    case "legacy": {
      // Legacy rows keep a NULL name, which the migrator ignores, so they stay
      // as history instead of tripping drizzle's own hash-matching upgrade.
      return [
        `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS name text;`,
        `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS applied_at timestamp with time zone DEFAULT now();`,
      ]
    }
    case "current": {
      return []
    }
    default: {
      const unhandled: never = table
      throw new Error(`Unhandled tracking table: ${JSON.stringify(unhandled)}`)
    }
  }
}

type LocalMigration = {
  name: string
  hash: string
  folderMillis: number
}

// Reuses drizzle's own reader so names, hashes and timestamps match exactly
// what the migrator computes.
function readLocalMigrations(): LocalMigration[] {
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

async function main(): Promise<void> {
  // Read directly instead of through drizzle.config.ts, which falls back to
  // the production URL in apps/web/.env when DATABASE_URL is unset.
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL must be set explicitly")
  }

  const local = readLocalMigrations()

  const client = new Client({ connectionString: url })
  await client.connect()
  const table = await inspectTrackingTable(client).finally(() => client.end())

  const recorded = table.kind === "current" ? table.recorded : new Set<string>()
  const localNames = new Set(local.map((m) => m.name))
  for (const name of recorded) {
    if (!localNames.has(name)) {
      console.error(`warning: ${name} is recorded but missing locally`)
    }
  }

  const pending = local.filter((m) => !recorded.has(m.name))
  if (pending.length === 0 && table.kind === "current") {
    console.error("Tracking table is up to date; nothing to baseline.")
    return
  }

  // applied_at stays NULL to mark rows recorded here rather than by the
  // migrator, mirroring what drizzle does when it upgrades legacy rows.
  const inserts = pending.map(
    (m) =>
      `INSERT INTO ${TABLE} (hash, created_at, name, applied_at) VALUES ('${m.hash}', ${m.folderMillis}, '${m.name}', NULL);`
  )

  console.log(["BEGIN;", ...preamble(table), ...inserts, "COMMIT;"].join("\n"))
  console.error(
    `${pending.length} of ${local.length} migrations to record (table: ${table.kind}).`
  )
}

await main()
