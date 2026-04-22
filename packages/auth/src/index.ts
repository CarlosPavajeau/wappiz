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
import { subscriptionOrders } from "@wappiz/db/schema/billing"
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
              tenantId: tenantId,
              planId: plan.id,
              externalId: event.data.id,
              externalCustomerId: event.data.customerId,
              status: event.data.status,
              currentPeriodStart: new Date(event.data.currentPeriodStart),
              currentPeriodEnd: new Date(event.data.currentPeriodEnd),
              environment,
            })
          },
          onSubscriptionUpdated: async (event) => {
            await updateSubscriptionStatus({
              status: event.data.status,
              externalId: event.data.id,
            })
          },
          onSubscriptionActive: async (event) => {
            await updateSubscriptionStatus({
              status: "active",
              externalId: event.data.id,
            })
          },
          onSubscriptionCanceled: async (event) => {
            await updateSubscriptionStatus({
              status: "canceled",
              externalId: event.data.id,
              cancelAtPeriodEnd: true,
              canceledAt: new Date(),
            })
          },
          onSubscriptionRevoked: async (event) => {
            await updateSubscriptionStatus({
              status: "revoked",
              externalId: event.data.id,
              canceledAt: new Date(),
            })
          },
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
              subscriptionId: subscription.id,
              externalId: event.data.id,
              amount: event.data.totalAmount,
              currency: event.data.currency,
              status: event.data.status,
              environment,
            })
          },
          onProductCreated: async (event) => {
            const price = event.data.prices[0]

            if (!price) {
              return
            }

            if (price.amountType !== "fixed") {
              return
            }

            const features = event.data.benefits
              .filter((benefit) => benefit.type === "feature_flag")
              .reduce(
                (acc, benefit) => {
                  acc[benefit.id] = true
                  return acc
                },
                {} as Record<string, boolean>
              )

            const environment = env.POLAR_MODE

            await upsertPlan({
              externalId: event.data.id,
              externalPriceId: price.id,
              name: event.data.name,
              description: event.data.description,
              price: price.priceAmount,
              currency: price.priceCurrency,
              interval: event.data.recurringInterval,
              isActive: !event.data.isArchived,
              features: features,
              environment,
            })
          },
          onProductUpdated: async (event) => {
            const price = event.data.prices[0]

            if (!price) {
              return
            }

            if (price.amountType !== "fixed") {
              return
            }

            const features = event.data.benefits
              .filter((benefit) => benefit.type === "feature_flag")
              .reduce(
                (acc, benefit) => {
                  acc[benefit.id] = true
                  return acc
                },
                {} as Record<string, boolean>
              )

            const environment = env.POLAR_MODE

            await upsertPlan({
              externalId: event.data.id,
              externalPriceId: price.id,
              name: event.data.name,
              description: event.data.description,
              price: price.priceAmount,
              currency: price.priceCurrency,
              interval: event.data.recurringInterval,
              isActive: !event.data.isArchived,
              features: features,
              environment,
            })
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
