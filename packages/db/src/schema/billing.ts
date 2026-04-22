import { sql } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

import { tenants } from "./tenants"

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: varchar("external_id", { length: 100 }).notNull().unique(),
  externalPriceId: varchar("external_price_id", { length: 100 }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  price: integer("price").notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("COP"),
  interval: varchar("interval", { length: 20 }), // "month" | "year" | null
  features: jsonb("features").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    externalId: varchar("external_id", { length: 100 }).notNull().unique(),
    externalCustomerId: varchar("external_customer_id", {
      length: 100,
    }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending" | "active" | "canceled" | "revoked"
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_tenant_active_subscription")
      .on(table.tenantId)
      .where(sql`status = 'active'`),
    index("idx_subscriptions_external_id").on(table.externalId),
  ]
)

export const subscriptionOrders = pgTable("subscription_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id")
    .notNull()
    .references(() => subscriptions.id),
  externalId: varchar("external_id", { length: 100 }).notNull().unique(),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("COP"),
  status: varchar("status", { length: 20 }).notNull(), // "paid" | "refunded"
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})
