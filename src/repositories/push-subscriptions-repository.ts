import { and, eq, inArray } from "drizzle-orm"
import { db, type FlexibleInsert } from "@/db"
import { pushSubscriptions } from "@/db/schema"

export type DbPushSubscription = typeof pushSubscriptions.$inferSelect

export async function listPushSubscriptionsByUserId(
  userId: string,
): Promise<DbPushSubscription[]> {
  return db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.user_id, userId))
}

export async function getPushSubscriptionByEndpoint(
  endpoint: string,
): Promise<DbPushSubscription | null> {
  const rows = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1)
  return rows[0] ?? null
}

export async function getPushSubscriptionByUserAndEndpoint(
  userId: string,
  endpoint: string,
): Promise<DbPushSubscription | null> {
  const rows = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.user_id, userId),
        eq(pushSubscriptions.endpoint, endpoint),
      ),
    )
    .limit(1)
  return rows[0] ?? null
}

export async function insertPushSubscription(
  payload: FlexibleInsert<typeof pushSubscriptions.$inferInsert>,
): Promise<DbPushSubscription> {
  // SAFETY: payload is FlexibleInsert<$inferInsert>; values are valid for DB insert.
  const insertValues = payload as typeof pushSubscriptions.$inferInsert
  const rows = await db
    .insert(pushSubscriptions)
    .values(insertValues)
    .returning()
  return rows[0]
}

export async function deletePushSubscriptionByEndpoint(
  endpoint: string,
): Promise<void> {
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
}

export async function deletePushSubscriptionByUserAndEndpoint(
  userId: string,
  endpoint: string,
): Promise<void> {
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.user_id, userId),
        eq(pushSubscriptions.endpoint, endpoint),
      ),
    )
}

export async function deletePushSubscriptionsForUser(
  userId: string,
  endpoints: string[],
): Promise<void> {
  if (endpoints.length === 0) return
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.user_id, userId),
        inArray(pushSubscriptions.endpoint, endpoints),
      ),
    )
}

export async function deletePushSubscriptionsByUserId(
  userId: string,
): Promise<void> {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.user_id, userId))
}
