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
  id: uuid().defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar({ length: 255 }).notNull(),
  type: varchar({ length: 50 }).default("barber").notNull(),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

export const workingHours = pgTable(
  "working_hours",
  {
    id: uuid().defaultRandom().primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    dayOfWeek: smallint("day_of_week").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
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
    id: uuid().defaultRandom().primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    date: date().notNull(),
    isDayOff: boolean("is_day_off").default(false).notNull(),
    startTime: time("start_time"),
    endTime: time("end_time"),
    reason: varchar({ length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    unique("uq_schedule_overrides_resource_date").on(
      table.resourceId,
      table.date
    ),
  ]
)
