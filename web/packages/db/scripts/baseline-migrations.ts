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

import { Client } from "pg"

import {
  inspectTrackingTable,
  MIGRATIONS_SCHEMA,
  readLocalMigrations,
  requireDatabaseUrl,
  TABLE,
} from "./migrations.ts"
import type { TrackingTable } from "./migrations.ts"

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

async function main(): Promise<void> {
  const url = requireDatabaseUrl()
  const local = readLocalMigrations()

  const client = new Client({ connectionString: url })
  await client.connect()
  const table = await inspectTrackingTable(client).finally(() => client.end())

  const recorded =
    table.kind === "current" ? table.recorded : new Map<string, string>()
  const localNames = new Set(local.map((m) => m.name))
  for (const name of recorded.keys()) {
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
