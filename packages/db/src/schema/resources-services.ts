import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core"

import { resources } from "./resources"
import { services } from "./services"

export const resourceServices = pgTable(
  "resource_services",
  {
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      columns: [table.resourceId, table.serviceId],
      name: "resource_services_pkey",
    }),
  ]
)
