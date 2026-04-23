import { sql } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

import { tenants } from "./tenants"

export const services = pgTable(
  "services",
  {
    bufferMinutes: integer("buffer_minutes").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    description: varchar({ length: 500 }),
    durationMinutes: integer("duration_minutes").notNull(),
    id: uuid().defaultRandom().primaryKey(),
    isActive: boolean("is_active").default(true).notNull(),
    name: varchar({ length: 255 }).notNull(),
    price: numeric({ precision: 10, scale: 2 }).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("idx_services_tenant_id").using(
      "btree",
      table.tenantId.asc().nullsLast()
    ),
  ]
)
