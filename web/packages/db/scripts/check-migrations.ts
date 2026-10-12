// Fails when the database's migration history disagrees with src/migrations
// in a way `drizzle-kit migrate` would silently get wrong. The deploy
// pipeline runs it before migrating.
//
// - A migration whose file changed after it was applied never re-runs (drizzle
//   matches by folder name), so the database keeps the old version. This is
//   an error. On staging it usually means a branch edited a migration that an
//   earlier push already applied; reset staging from prod to recover.
// - A recorded migration missing locally usually comes from a staging deploy
//   of an abandoned branch. The database has schema the repo doesn't know
//   about, which is worth knowing but not blocking.
// - A table without `name` (pre-1.0 layout) or no table at all means the
//   database was never baselined; migrate would re-run everything.
//
// Usage: DATABASE_URL=... node scripts/check-migrations.ts

import { Client } from "pg"

import {
  inspectTrackingTable,
  readLocalMigrations,
  requireDatabaseUrl,
} from "./migrations.ts"
import type { LocalMigration } from "./migrations.ts"

// Prints every disagreement and returns the migrations that changed after
// being applied, the only blocking kind.
function reportDrift(
  local: readonly LocalMigration[],
  recorded: ReadonlyMap<string, string>
): LocalMigration[] {
  const changed = local.filter((m) => {
    const hash = recorded.get(m.name)
    return hash !== undefined && hash !== m.hash
  })
  for (const m of changed) {
    console.error(
      `error: ${m.name} changed after it was applied; the database keeps the old version`
    )
  }

  const localNames = new Set(local.map((m) => m.name))
  for (const name of recorded.keys()) {
    if (!localNames.has(name)) {
      console.error(`warning: ${name} is applied but missing locally`)
    }
  }
  return changed
}

async function main(): Promise<void> {
  const url = requireDatabaseUrl()
  const local = readLocalMigrations()

  const client = new Client({ connectionString: url })
  await client.connect()
  const table = await inspectTrackingTable(client).finally(() => client.end())

  if (table.kind !== "current") {
    throw new Error(
      `Migrations table is ${table.kind}; run \`pnpm db:baseline\` before migrating.`
    )
  }

  const changed = reportDrift(local, table.recorded)

  if (changed.length > 0) {
    process.exitCode = 1
    return
  }

  const pending = local.filter((m) => !table.recorded.has(m.name))
  console.error(`${pending.length} pending migration(s).`)
  for (const m of pending) {
    console.error(`  ${m.name}`)
  }
}

await main()
