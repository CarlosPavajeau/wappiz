import { sql } from "drizzle-orm"
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

import { tenants } from "./tenants"

export const domainEvents = pgTable(
  "domain_events",
  {
    id: uuid().defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    payload: jsonb().default({}).notNull(),
    attempts: integer().default(0).notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    claimId: uuid("claim_id"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("idx_domain_events_pending")
      .using(
        "btree",
        table.attempts.asc().nullsLast(),
        table.createdAt.asc().nullsLast()
      )
      .where(
        sql`(processed_at IS NULL AND failed_at IS NULL AND claimed_at IS NULL)`
      ),
  ]
)

export const domainEventHandlerCompletions = pgTable(
  "domain_event_handler_completions",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => domainEvents.id, { onDelete: "cascade" }),
    handlerId: varchar("handler_id", { length: 200 }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.eventId, table.handlerId],
    }),
  ]
)
