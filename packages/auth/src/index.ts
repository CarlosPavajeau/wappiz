import { polar, checkout, portal, usage, webhooks } from "@polar-sh/better-auth"
import { db } from "@wappiz/db"
import * as schema from "@wappiz/db/schema/auth"
import { env } from "@wappiz/env/server"
import { createPolarClient } from "@wappiz/polar"
import { Resend } from "@wappiz/resend"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { betterAuth } from "better-auth/minimal"
import { jwt, admin } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"

const polarClient = createPolarClient(env.POLAR_ACCESS_TOKEN, env.POLAR_MODE)

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }, _) => {
      const resend = new Resend({ apiKey: env.RESEND_API_KEY })
      await resend.sendResetPasswordEmail(user.email, url)
    },
    onPasswordReset: async ({ user }) => {
      const resend = new Resend({ apiKey: env.RESEND_API_KEY })
      await resend.sendPasswordResetEmail(user.email)
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
    },
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
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          successUrl: "/dashboard?checkout_id={CHECKOUT_ID}",
          authenticatedUsersOnly: true,
        }),
        portal(),
        usage(),
        webhooks({
          secret: env.POLAR_WEBHOOK_SECRET,
          onSubscriptionActive: async (subscription) => {
            console.log("Subscription active", subscription.data.productId)
          },
        }),
      ],
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
