import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  smallint,
  timestamp,
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
    check(
      "working_hours_day_of_week_check",
      sql`((day_of_week >= 0) AND (day_of_week <= 6))`
    ),
    check("working_hours_time_check", sql`start_time < end_time`),
  ]
)

export const scheduleOverrideKind = pgEnum("schedule_override_kind", [
  "time_off",
  "custom_hours",
])

export const scheduleOverrides = pgTable(
  "schedule_overrides",
  {
    id: uuid().defaultRandom().primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    kind: scheduleOverrideKind().notNull(),
    startTime: time("start_time"),
    endTime: time("end_time"),
    reason: varchar({ length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("idx_schedule_overrides_resource_dates").using(
      "btree",
      table.resourceId.asc().nullsLast(),
      table.startDate.asc().nullsLast(),
      table.endDate.asc().nullsLast()
    ),
    check("schedule_overrides_date_range_check", sql`end_date >= start_date`),
    check(
      "schedule_overrides_times_paired_check",
      sql`(start_time IS NULL) = (end_time IS NULL)`
    ),
    check(
      "schedule_overrides_custom_hours_times_check",
      sql`kind <> 'custom_hours' OR start_time IS NOT NULL`
    ),
    check(
      "schedule_overrides_time_order_check",
      sql`start_time IS NULL OR start_time < end_time`
    ),
  ]
)
