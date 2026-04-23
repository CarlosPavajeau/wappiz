import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  integer,
  pgTable,
  smallint,
  timestamp,
  unique,
  uuid,
  varchar,
  date,
  time,
  index,
} from "drizzle-orm/pg-core"

import { tenants } from "./tenants"

export const resources = pgTable("resources", {
  avatarUrl: varchar("avatar_url", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  id: uuid().defaultRandom().primaryKey(),
  isActive: boolean("is_active").default(true).notNull(),
  name: varchar({ length: 255 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  type: varchar({ length: 50 }).default("barber").notNull(),
})

export const workingHours = pgTable(
  "working_hours",
  {
    dayOfWeek: smallint("day_of_week").notNull(),
    endTime: time("end_time").notNull(),
    id: uuid().defaultRandom().primaryKey(),
    isActive: boolean("is_active").default(true).notNull(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    startTime: time("start_time").notNull(),
  },
  (table) => [
    index("idx_working_hours_resource_id").using(
      "btree",
      table.resourceId.asc().nullsLast()
    ),
    unique("uq_working_hours_resource_day").on(
      table.resourceId,
      table.dayOfWeek
    ),
    check(
      "working_hours_day_of_week_check",
      sql`((day_of_week >= 0) AND (day_of_week <= 6))`
    ),
  ]
)

export const scheduleOverrides = pgTable(
  "schedule_overrides",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    date: date().notNull(),
    endTime: time("end_time"),
    id: uuid().defaultRandom().primaryKey(),
    isDayOff: boolean("is_day_off").default(false).notNull(),
    reason: varchar({ length: 255 }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    startTime: time("start_time"),
  },
  (table) => [
    unique("uq_schedule_overrides_resource_date").on(
      table.resourceId,
      table.date
    ),
  ]
)
