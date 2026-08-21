import { eq } from "drizzle-orm"
import { db } from "@/db"
import { userNotificationPrefs } from "@/db/schema"

export type DbUserNotificationPref = typeof userNotificationPrefs.$inferSelect

export async function getUserNotificationPrefs(
  userId: string,
): Promise<DbUserNotificationPref | null> {
  const rows = await db
    .select()
    .from(userNotificationPrefs)
    .where(eq(userNotificationPrefs.user_id, userId))
    .limit(1)
  return rows[0] ?? null
}

export async function upsertUserNotificationPrefs(
  payload: typeof userNotificationPrefs.$inferInsert,
): Promise<DbUserNotificationPref> {
  const insertValues = payload
  const { user_id: _user_id, created_at: _created_at, updated_at: _updated_at, ...updateValues } =
    insertValues
  const rows = await db
    .insert(userNotificationPrefs)
    .values(insertValues)
    .onConflictDoUpdate({
      target: userNotificationPrefs.user_id,
      set: {
        ...updateValues,
        updated_at: new Date(),
      },
    })
    .returning()
  return rows[0]
}

export async function updateUserNotificationPrefs(
  userId: string,
  updates: Partial<typeof userNotificationPrefs.$inferInsert>,
): Promise<DbUserNotificationPref> {
  const setValues = updates
  const rows = await db
    .update(userNotificationPrefs)
    .set(setValues)
    .where(eq(userNotificationPrefs.user_id, userId))
    .returning()
  return rows[0]
}
