import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

import { users } from "./auth"
import { customers } from "./customers"
import { resources } from "./resources"
import { services } from "./services"
import { tenants } from "./tenants"

export const appointmentStatus = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
  "check_in",
])

export const appointments = pgTable(
  "appointments",
  {
    id: uuid().defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: appointmentStatus().default("pending").notNull(),
    cancelledBy: text("cancelled_by"),
    cancelReason: varchar("cancel_reason", { length: 500 }),
    priceAtBooking: numeric("price_at_booking", {
      precision: 10,
      scale: 2,
    }).notNull(),
    reminder24hSentAt: timestamp("reminder_24h_sent_at", {
      withTimezone: true,
    }),
    reminder1hSentAt: timestamp("reminder_1h_sent_at", { withTimezone: true }),
    notes: varchar({ length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_appointments_cancelled_recent")
      .using("btree", table.cancelledAt.desc().nullsFirst())
      .where(
        sql`((status = 'cancelled'::appointment_status) AND (cancelled_at IS NOT NULL))`
      ),
    index("idx_appointments_reminder")
      .using(
        "btree",
        table.startsAt.asc().nullsLast(),
        table.reminder24hSentAt.asc().nullsLast(),
        table.reminder1hSentAt.asc().nullsLast()
      )
      .where(sql`(status = 'confirmed'::appointment_status)`),
    index("idx_appointments_status_date").using(
      "btree",
      table.tenantId.asc().nullsLast(),
      table.status.asc().nullsLast(),
      table.startsAt.asc().nullsLast()
    ),
    index("idx_appointments_unattended")
      .using("btree", table.startsAt.asc().nullsLast())
      .where(sql`(status = 'confirmed'::appointment_status)`),
    // Overlapping appointments are rejected by the EXCLUDE constraints
    // no_overlap (per resource) and no_customer_overlap (per customer).
    // Drizzle cannot model exclusion constraints, so they live in
    // migration 20261003*_appointments_overlap_exclusion and, for the Go
    // test schema, in scripts/schema-extras.sql.
  ]
)

export const appointmentStatusHistory = pgTable(
  "appointment_status_history",
  {
    id: uuid().defaultRandom().primaryKey(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id),
    fromStatus: appointmentStatus("from_status").notNull(),
    toStatus: appointmentStatus("to_status").notNull(),
    changedBy: text("changed_by").references(() => users.id),
    changedByRole: varchar("changed_by_role", { length: 20 }),
    reason: varchar({ length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("idx_status_history_appointment").using(
      "btree",
      table.appointmentId.asc().nullsLast()
    ),
  ]
)

export const appointmentPenaltyEvents = pgTable(
  "appointment_penalty_events",
  {
    id: uuid().defaultRandom().primaryKey(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 20 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("idx_appointment_penalty_events_customer").using(
      "btree",
      table.tenantId.asc().nullsLast(),
      table.customerId.asc().nullsLast(),
      table.occurredAt.desc().nullsFirst()
    ),
    unique("appointment_penalty_events_unique").on(
      table.appointmentId,
      table.eventType
    ),
  ]
)

export const appointmentReminderEvents = pgTable(
  "appointment_reminder_events",
  {
    id: uuid().defaultRandom().primaryKey(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    reminderType: varchar("reminder_type", { length: 10 }).notNull(),
    attempts: integer().default(0).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("idx_appointment_reminder_events_pending")
      .using(
        "btree",
        table.sentAt.asc().nullsLast(),
        table.attempts.asc().nullsLast(),
        table.createdAt.asc().nullsLast()
      )
      .where(sql`(sent_at IS NULL)`),
    unique("appointment_reminder_events_unique").on(
      table.appointmentId,
      table.reminderType
    ),
  ]
)

export const appointmentFieldResponses = pgTable(
  "appointment_field_responses",
  {
    id: uuid().defaultRandom().primaryKey(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    fieldKey: varchar("field_key", { length: 50 }).notNull(),
    response: text("response").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    unique("uq_appointment_field").on(table.appointmentId, table.fieldKey),
    index("idx_field_responses_appointment").on(table.appointmentId),
    check(
      "appointment_field_responses_length_check",
      sql`char_length(response) <= 1000`
    ),
  ]
)
