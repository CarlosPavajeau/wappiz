import { sql } from "drizzle-orm"
import {
  boolean,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

import { tenants } from "./tenants"

export const customers = pgTable(
  "customers",
  {
    id: uuid().defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
    name: varchar({ length: 255 }),
    isBlocked: boolean("is_blocked").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    noShowCount: integer("no_show_count").default(0).notNull(),
    lateCancelCount: integer("late_cancel_count").default(0).notNull(),
  },
  (table) => [
    unique("clients_tenant_id_phone_number_key").on(
      table.tenantId,
      table.phoneNumber
    ),
  ]
)
