import { db } from "@wappiz/db"
import * as schema from "@wappiz/db/schema/auth"
import { env } from "@wappiz/env/server"
import { Resend } from "@wappiz/resend"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { jwt, admin } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const resend = new Resend({ apiKey: env.RESEND_API_KEY })

          const response = await resend.client.contacts.create({
            email: user.email,
          })

          if (response.data) {
            await resend.client.contacts.segments.add({
              contactId: response.data.id,
              segmentId: env.RESEND_SEGMENT_ID,
            })
          } else if (response.error) {
            console.error(
              "Error occurred while creating contact",
              response.error
            )
          }

          await resend.sendWelcomeEmail(user.email)
        },
      },
    },
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
        }),
      },
    }),
    tanstackStartCookies(),
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
