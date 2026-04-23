import { polar, checkout, portal, usage, webhooks } from "@polar-sh/better-auth"
import { db } from "@wappiz/db"
import {
  findPlanByExternalId,
  findSubscriptionByExternalId,
  insertSubscription,
  insertSubscriptionOrder,
  updateSubscriptionStatus,
  upsertPlan,
} from "@wappiz/db/queries/billing"
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

    schema,
  }),
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
  emailAndPassword: {
    enabled: true,
    onPasswordReset: async ({ user }) => {
      const resend = new Resend({ apiKey: env.RESEND_API_KEY })
      await resend.sendPasswordResetEmail(user.email)
    },
    sendResetPassword: async ({ user, url }, _) => {
      const resend = new Resend({ apiKey: env.RESEND_API_KEY })
      await resend.sendResetPasswordEmail(user.email, url)
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
          authenticatedUsersOnly: true,
          successUrl: "/dashboard/billing?checkout_id={CHECKOUT_ID}",
        }),
        portal(),
        usage(),
        webhooks({
          onOrderCreated: async (event) => {
            const tenantId =
              event.data.subscription?.metadata.tenant_id?.toString()

            if (!tenantId) {
              console.error(
                `Missing tenant_id in subscription metadata`,
                event.data
              )
              throw new Error(`Missing tenant_id in subscription metadata`)
            }

            const subscriptionId = event.data.subscription?.id

            if (!subscriptionId) {
              console.error(
                `Missing subscriptionId in order metadata`,
                event.data
              )
              throw new Error(`Missing subscriptionId in order metadata`)
            }

            const subscription =
              await findSubscriptionByExternalId(subscriptionId)

            if (!subscription) {
              console.error(`Subscription not found`, subscriptionId)
              throw new Error(`Subscription not found`)
            }

            const environment = env.POLAR_MODE

            await insertSubscriptionOrder({
              amount: event.data.totalAmount,
              currency: event.data.currency,
              environment,
              externalId: event.data.id,
              status: event.data.status,
              subscriptionId: subscription.id,
            })
          },
          onProductCreated: async (event) => {
            const [price] = event.data.prices

            if (!price) {
              return
            }

            if (price.amountType !== "fixed") {
              return
            }

            const features: Record<string, boolean> = {}
            const benefits = event.data.benefits.filter(
              (b) => b.type === "feature_flag"
            )
            for (const benefit of benefits) {
              features[benefit.id] = true
            }

            const environment = env.POLAR_MODE

            await upsertPlan({
              currency: price.priceCurrency,
              description: event.data.description,
              environment,
              externalId: event.data.id,
              externalPriceId: price.id,
              features,
              interval: event.data.recurringInterval,
              isActive: !event.data.isArchived,
              name: event.data.name,
              price: price.priceAmount,
            })
          },
          onProductUpdated: async (event) => {
            const [price] = event.data.prices

            if (!price) {
              return
            }

            if (price.amountType !== "fixed") {
              return
            }

            const features: Record<string, boolean> = {}
            const benefits = event.data.benefits.filter(
              (b) => b.type === "feature_flag"
            )
            for (const benefit of benefits) {
              features[benefit.id] = true
            }

            const environment = env.POLAR_MODE

            await upsertPlan({
              currency: price.priceCurrency,
              description: event.data.description,
              environment,
              externalId: event.data.id,
              externalPriceId: price.id,
              features,
              interval: event.data.recurringInterval,
              isActive: !event.data.isArchived,
              name: event.data.name,
              price: price.priceAmount,
            })
          },
          onSubscriptionActive: async (event) => {
            await updateSubscriptionStatus({
              externalId: event.data.id,
              status: "active",
            })
          },
          onSubscriptionCanceled: async (event) => {
            await updateSubscriptionStatus({
              cancelAtPeriodEnd: true,
              canceledAt: new Date(),
              externalId: event.data.id,
              status: "canceled",
            })
          },
          onSubscriptionCreated: async (event) => {
            const tenantId = event.data.metadata.tenant_id?.toString()
            if (!tenantId) {
              throw new Error(`Missing tenant_id in subscription metadata`)
            }

            const plan = await findPlanByExternalId(event.data.productId)
            if (!plan) {
              throw new Error(
                `Plan not found for productId: ${event.data.productId}`
              )
            }

            const environment = env.POLAR_MODE

            await insertSubscription({
              currentPeriodEnd: new Date(event.data.currentPeriodEnd),
              currentPeriodStart: new Date(event.data.currentPeriodStart),
              environment,
              externalCustomerId: event.data.customerId,
              externalId: event.data.id,
              planId: plan.id,
              status: event.data.status,
              tenantId,
            })
          },
          onSubscriptionRevoked: async (event) => {
            await updateSubscriptionStatus({
              canceledAt: new Date(),
              externalId: event.data.id,
              status: "revoked",
            })
          },
          onSubscriptionUpdated: async (event) => {
            await updateSubscriptionStatus({
              externalId: event.data.id,
              status: event.data.status,
            })
          },
          secret: env.POLAR_WEBHOOK_SECRET,
        }),
      ],
    }),
    tanstackStartCookies(),
  ],
  secret: env.BETTER_AUTH_SECRET,
  session: {
    cookieCache: {
      enabled: true,
      // Cache duration in seconds
      maxAge: 5 * 60,
    },
  },
  socialProviders: {
    google: {
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    },
  },
  trustedOrigins: [env.CORS_ORIGIN],
})
