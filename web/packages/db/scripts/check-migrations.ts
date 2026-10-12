// Fails when the database's migration history disagrees with src/migrations
// in a way `drizzle-kit migrate` would silently get wrong (see checkHistory
// in migrations.ts for the rules). The deploy pipeline runs it before
// migrating. On staging, a changed migration usually means a branch edited one
// that an earlier push already applied; reset staging from prod to recover.
//
// Usage: DATABASE_URL=... node scripts/check-migrations.ts

import { Client } from "pg"

import {
  checkHistory,
  inspectTrackingTable,
  readLocalMigrations,
  requireDatabaseUrl,
} from "./migrations.ts"
import type { HistoryCheck } from "./migrations.ts"

// Prints the result and sets the exit code; only `changed` fails the step.
function report(result: HistoryCheck): void {
  switch (result.kind) {
    case "not-baselined": {
      throw new Error(
        `Migrations table is ${result.table}; run \`pnpm db:baseline\` before migrating.`
      )
    }
    case "changed": {
      for (const m of result.changed) {
        console.error(
          `error: ${m.name} changed after it was applied; the database keeps the old version`
        )
      }
      warnUnknown(result.unknown)
      process.exitCode = 1
      return
    }
    case "ok": {
      warnUnknown(result.unknown)
      console.error(`${result.pending.length} pending migration(s).`)
      for (const m of result.pending) {
        console.error(`  ${m.name}`)
      }
      return
    }
    default: {
      const unhandled: never = result
      throw new Error(`Unhandled history check: ${JSON.stringify(unhandled)}`)
    }
  }
}

function warnUnknown(unknown: readonly string[]): void {
  for (const name of unknown) {
    console.error(`warning: ${name} is applied but missing locally`)
  }
}

async function main(): Promise<void> {
  const url = requireDatabaseUrl()
  const local = readLocalMigrations()

  const client = new Client({ connectionString: url })
  await client.connect()
  const table = await inspectTrackingTable(client).finally(() => client.end())

  report(checkHistory(local, table))
}

await main()
