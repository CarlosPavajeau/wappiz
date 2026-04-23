import { sql } from "drizzle-orm"
import {
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

import { user } from "./auth"
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
    cancelReason: varchar("cancel_reason", { length: 500 }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: text("cancelled_by"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    id: uuid().defaultRandom().primaryKey(),
    notes: varchar({ length: 500 }),
    priceAtBooking: numeric("price_at_booking", {
      precision: 10,
      scale: 2,
    }).notNull(),
    reminder1hSentAt: timestamp("reminder_1h_sent_at", { withTimezone: true }),
    reminder24hSentAt: timestamp("reminder_24h_sent_at", {
      withTimezone: true,
    }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    status: appointmentStatus().default("pending").notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
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
    index("no_customer_overlap")
      .using(
        "gist",
        table.tenantId.asc().nullsLast(),
        table.customerId.asc().nullsLast(),
        sql`tstzrange(starts_at, ends_at)`
      )
      .where(
        sql`(status <> ALL (ARRAY['cancelled'::appointment_status, 'no_show'::appointment_status]))`
      ),
    index("no_overlap")
      .using(
        "gist",
        table.resourceId.asc().nullsLast(),
        sql`tstzrange(starts_at, ends_at)`
      )
      .where(
        sql`(status <> ALL (ARRAY['cancelled'::appointment_status, 'no_show'::appointment_status]))`
      ),
  ]
)

export const appointmentStatusHistory = pgTable(
  "appointment_status_history",
  {
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id),
    changedBy: text("changed_by").references(() => user.id),
    changedByRole: varchar("changed_by_role", { length: 20 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    fromStatus: appointmentStatus("from_status").notNull(),
    id: uuid().defaultRandom().primaryKey(),
    reason: varchar({ length: 500 }),
    toStatus: appointmentStatus("to_status").notNull(),
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
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 20 }).notNull(),
    id: uuid().defaultRandom().primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
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
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    attempts: integer().default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    id: uuid().defaultRandom().primaryKey(),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    lastError: text("last_error"),
    reminderType: varchar("reminder_type", { length: 10 }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
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
