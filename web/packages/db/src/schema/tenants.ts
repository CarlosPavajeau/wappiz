import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
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

// Each type has its own validation; the length columns only apply to "text"
// and the value columns only to "number", which the checks below enforce.
export const flowFieldType = pgEnum("flow_field_type", [
  "text",
  "email",
  "document",
  "number",
  "date",
  "phone",
])

export const tenantFlowFields = pgTable(
  "tenant_flow_fields",
  {
    id: uuid().defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    fieldKey: varchar("field_key", { length: 50 }).notNull(),
    question: text().notNull(),
    fieldType: flowFieldType("field_type").default("text").notNull(),
    minLength: smallint("min_length"),
    maxLength: smallint("max_length"),
    minValue: integer("min_value"),
    maxValue: integer("max_value"),
    isRequired: boolean("is_required").default(false).notNull(),
    isOneTime: boolean("is_one_time").default(false).notNull(),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    unique("uq_tenant_field_key").on(table.tenantId, table.fieldKey),
    check(
      "tenant_flow_fields_question_length_check",
      sql`char_length(question) BETWEEN 2 AND 500`
    ),
    check(
      "tenant_flow_fields_text_length_check",
      sql`field_type <> 'text' OR (min_length IS NOT NULL AND max_length IS NOT NULL AND min_length >= 0 AND min_length <= max_length AND max_length BETWEEN 1 AND 1000)`
    ),
    check(
      "tenant_flow_fields_length_only_text_check",
      sql`field_type = 'text' OR (min_length IS NULL AND max_length IS NULL)`
    ),
    check(
      "tenant_flow_fields_value_only_number_check",
      sql`field_type = 'number' OR (min_value IS NULL AND max_value IS NULL)`
    ),
    check(
      "tenant_flow_fields_value_range_check",
      sql`min_value IS NULL OR max_value IS NULL OR min_value <= max_value`
    ),
  ]
)
