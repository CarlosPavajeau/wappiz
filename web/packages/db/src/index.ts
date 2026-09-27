import { env } from "@wappiz/env/server"
import { drizzle } from "drizzle-orm/node-postgres"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"

import { relations } from "./relations"

// Annotated so declaration emit does not need to name pg's `Pool` (the
// inferred type carries `$client: Pool`), which TS 7 reports as TS2883.
export const db: NodePgDatabase<typeof relations> = drizzle(env.DATABASE_URL, {
  relations,
})
