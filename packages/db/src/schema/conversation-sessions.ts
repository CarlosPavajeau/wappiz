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
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    data: jsonb().default({}).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    id: uuid().defaultRandom().primaryKey(),
    step: varchar({ length: 50 }).notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    whatsappConfigId: uuid("whatsapp_config_id")
      .notNull()
      .references(() => tenantWhatsappConfigs.id),
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
