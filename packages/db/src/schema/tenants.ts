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
    appointmentsThisMonth: integer("appointments_this_month")
      .default(0)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    currency: varchar({ length: 3 }).default("COP").notNull(),
    id: uuid().defaultRandom().primaryKey(),
    isActive: boolean("is_active").default(true).notNull(),
    monthResetAt: timestamp("month_reset_at", { withTimezone: true }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    settings: jsonb().default({}),
    slug: varchar({ length: 100 }).notNull(),
    timezone: varchar({ length: 50 }).default("America/Bogota").notNull(),
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
    accessToken: text("access_token"),
    activationContactEmail: text("activation_contact_email"),
    activationNotes: text("activation_notes"),
    activationRequestedAt: timestamp("activation_requested_at", {
      withTimezone: true,
    }),
    activationStatus: whatsappActivationStatus("activation_status")
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    displayPhoneNumber: varchar("display_phone_number", { length: 20 }),
    id: uuid().defaultRandom().primaryKey(),
    isActive: boolean("is_active").default(false).notNull(),
    phoneNumberId: varchar("phone_number_id", { length: 100 }),
    rejectReason: text("reject_reason"),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    wabaId: varchar("waba_id", { length: 100 }),
  },
  (table) => [
    unique("tenant_whatsapp_configs_phone_number_id_key").on(
      table.phoneNumberId
    ),
    unique("tenant_whatsapp_configs_tenant_id_key").on(table.tenantId),
  ]
)

export const flowFieldType = pgEnum("flow_field_type", ["predefined", "custom"])

export const tenantFlowFields = pgTable(
  "tenant_flow_fields",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    fieldKey: varchar("field_key", { length: 50 }).notNull(),
    fieldType: flowFieldType("field_type").notNull(),
    id: uuid().defaultRandom().primaryKey(),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    isRequired: boolean("is_required").default(false).notNull(),
    question: text("question"),
    sortOrder: integer("sort_order").notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
  },
  (table) => [unique("uq_tenant_field_key").on(table.tenantId, table.fieldKey)]
)
