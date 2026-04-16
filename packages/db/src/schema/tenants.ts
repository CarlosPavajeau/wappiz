import { sql } from "drizzle-orm"
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  unique,
} from "drizzle-orm/pg-core"

export const tenants = pgTable(
  "tenants",
  {
    id: uuid().defaultRandom().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 100 }).notNull(),
    timezone: varchar({ length: 50 }).default("America/Bogota").notNull(),
    currency: varchar({ length: 3 }).default("COP").notNull(),
    plan: varchar({ length: 20 }).default("free").notNull(),
    planExpiresAt: timestamp("plan_expires_at", { withTimezone: true }),
    appointmentsThisMonth: integer("appointments_this_month")
      .default(0)
      .notNull(),
    monthResetAt: timestamp("month_reset_at", { withTimezone: true }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    settings: jsonb().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [unique("tenants_slug_key").on(table.slug)]
)

export const whatsappActivationStatus = pgEnum("whatsapp_activation_status", [
  "pending",
  "in_progress",
  "active",
  "failed",
])

export const tenantWhatsappConfigs = pgTable(
  "tenant_whatsapp_configs",
  {
    id: uuid().defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    wabaId: varchar("waba_id", { length: 100 }),
    phoneNumberId: varchar("phone_number_id", { length: 100 }),
    displayPhoneNumber: varchar("display_phone_number", { length: 20 }),
    accessToken: text("access_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    isActive: boolean("is_active").default(false).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    activationStatus: whatsappActivationStatus("activation_status")
      .default("pending")
      .notNull(),
    activationRequestedAt: timestamp("activation_requested_at", {
      withTimezone: true,
    }),
    activationNotes: text("activation_notes"),
    activationContactEmail: text("activation_contact_email"),
    rejectReason: text("reject_reason"),
  },
  (table) => [
    unique("tenant_whatsapp_configs_phone_number_id_key").on(
      table.phoneNumberId
    ),
    unique("tenant_whatsapp_configs_tenant_id_key").on(table.tenantId),
  ]
)
