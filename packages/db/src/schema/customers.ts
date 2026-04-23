import { sql } from "drizzle-orm"
import {
  boolean,
  date,
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
    address: varchar({ length: 255 }),
    birthDate: date("birth_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    documentId: varchar({ length: 20 }),
    email: varchar({ length: 255 }),
    id: uuid().defaultRandom().primaryKey(),
    isBlocked: boolean("is_blocked").default(false).notNull(),
    lateCancelCount: integer("late_cancel_count").default(0).notNull(),
    name: varchar({ length: 255 }),
    noShowCount: integer("no_show_count").default(0).notNull(),
    phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("clients_tenant_id_phone_number_key").on(
      table.tenantId,
      table.phoneNumber
    ),
  ]
)
