import { env } from "@wappiz/env/server"
import { drizzle } from "drizzle-orm/node-postgres"

import { relations } from "./relations"

export const db = drizzle(env.DATABASE_URL, { relations })
