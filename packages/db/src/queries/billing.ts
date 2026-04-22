import { eq } from "drizzle-orm"

import { db } from ".."
import { plans, subscriptions } from "../schema"

export type InsertSubscription = typeof subscriptions.$inferInsert

export async function insertSubscription(subscription: InsertSubscription) {
  return await db.insert(subscriptions).values(subscription).returning()
}

export type UpdateSubscription = {
  status: string
  cancelAtPeriodEnd?: boolean
  canceledAt?: Date
  externalId: string
}

export async function updateSubscriptionStatus(
  subscription: UpdateSubscription
) {
  await db
    .update(subscriptions)
    .set({
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.externalId, subscription.externalId))
}

export async function findPlanByExternalId(externalId: string) {
  return await db.query.plans.findFirst({
    where: {
      externalId: externalId,
    },
    columns: {
      id: true,
      name: true,
    },
  })
}

export type InsertPlan = typeof plans.$inferInsert
export async function upsertPlan(plan: InsertPlan) {
  const existingPlan = await findPlanByExternalId(plan.externalId)
  if (existingPlan) {
    const [updated] = await db
      .update(plans)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(plans.externalId, plan.externalId))
      .returning()

    return updated
  }

  const [created] = await db.insert(plans).values(plan).returning()

  return created
}
