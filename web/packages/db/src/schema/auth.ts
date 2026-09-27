import { sql } from "drizzle-orm"
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core"

export const users = pgTable(
  "users",
  {
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    email: text().notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    id: text().primaryKey(),
    image: text(),
    name: text().notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`now()`)
      .notNull(),
    banExpires: timestamp("ban_expires", { precision: 6, withTimezone: true }),
    banReason: text("ban_reason"),
    banned: boolean(),
    role: text(),
  },
  (table) => [unique("users_email_unique").on(table.email)]
)

export const sessions = pgTable(
  "sessions",
  {
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    id: text().primaryKey(),
    ipAddress: text("ip_address"),
    token: text().notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [
    index("session_userId_idx").using("btree", table.userId.asc().nullsLast()),
    unique("sessions_token_unique").on(table.token),
  ]
)

export const accounts = pgTable(
  "accounts",
  {
    accessToken: text("access_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    accountId: text("account_id").notNull(),
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    id: text().primaryKey(),
    idToken: text("id_token"),
    password: text(),
    providerId: text("provider_id").notNull(),
    refreshToken: text("refresh_token"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text(),
    updatedAt: timestamp("updated_at").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("account_userId_idx").using("btree", table.userId.asc().nullsLast()),
  ]
)

export const verifications = pgTable(
  "verifications",
  {
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    id: text().primaryKey(),
    identifier: text().notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`now()`)
      .notNull(),
    value: text().notNull(),
  },
  (table) => [
    index("verification_identifier_idx").using(
      "btree",
      table.identifier.asc().nullsLast()
    ),
  ]
)

export const jwkss = pgTable("jwks", {
  alg: text(),
  createdAt: timestamp("created_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  crv: text(),
  expiresAt: timestamp("expires_at", { precision: 6, withTimezone: true }),
  id: text().primaryKey(),
  privateKey: text("private_key").notNull(),
  publicKey: text("public_key").notNull(),
})
