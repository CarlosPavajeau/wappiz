import { db } from "@wappiz/db"
import * as schema from "@wappiz/db/schema/auth"
import { env } from "@wappiz/env/server"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { jwt, admin } from "better-auth/plugins"

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin(),
    jwt({
      jwks: {
        jwksPath: "/.well-known/jwks.json",
      },
      jwt: {
        definePayload: ({ user }) => ({
          ...user,
          role: "admin",
        }),
      },
    }),
    nextCookies(),
  ],
  secret: env.BETTER_AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    },
  },
  trustedOrigins: [env.CORS_ORIGIN],
})
