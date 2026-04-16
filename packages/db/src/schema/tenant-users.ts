import { pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core"

import { user } from "./auth"
import { tenants } from "./tenants"

export const tenantUsers = pgTable(
  "tenant_users",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    role: text().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.tenantId],
      name: "tenant_users_pkey",
    }),
  ]
)
