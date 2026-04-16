import { sql } from "drizzle-orm"
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

import { customers } from "./customers"
import { tenants, tenantWhatsappConfigs } from "./tenants"

export const conversationSessions = pgTable(
  "conversation_sessions",
  {
    id: uuid().defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    whatsappConfigId: uuid("whatsapp_config_id")
      .notNull()
      .references(() => tenantWhatsappConfigs.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    step: varchar({ length: 50 }).notNull(),
    data: jsonb().default({}).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("idx_sessions_active_lookup").using(
      "btree",
      table.tenantId.asc().nullsLast(),
      table.customerId.asc().nullsLast(),
      table.expiresAt.asc().nullsLast()
    ),
    unique("conversation_sessions_tenant_id_client_id_key").on(
      table.tenantId,
      table.customerId
    ),
  ]
)
