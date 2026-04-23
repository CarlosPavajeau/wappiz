import { sql } from "drizzle-orm"
import { integer, pgTable, timestamp, unique } from "drizzle-orm/pg-core"
import { uuid } from "drizzle-orm/pg-core"

import { tenants } from "./tenants"

export const onboardingProgress = pgTable(
  "onboarding_progress",
  {
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    currentStep: integer("current_step").default(1).notNull(),
    id: uuid().defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [unique("onboarding_progress_tenant_id_key").on(table.tenantId)]
)
