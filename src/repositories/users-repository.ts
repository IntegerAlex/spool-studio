import { asc, eq, inArray } from "drizzle-orm"
import { db, type FlexibleInsert } from "@/db"
import { users } from "@/db/schema"

export type DbUser = typeof users.$inferSelect

export async function listUsers(): Promise<DbUser[]> {
  const rows = await db.select().from(users).orderBy(asc(users.full_name))
  return rows
}

export async function listUsersByIds(userIds: string[]): Promise<DbUser[]> {
  if (userIds.length === 0) {
    return []
  }

  const rows = await db.select().from(users).where(inArray(users.id, userIds))
  return rows
}

export async function getUserById(userId: string): Promise<DbUser | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return rows[0] ?? null
}

export async function insertUser(
  payload: FlexibleInsert<typeof users.$inferInsert>,
): Promise<DbUser> {
  // SAFETY: payload is FlexibleInsert<$inferInsert>; string dates are valid for DB insert.
  const insertValues = payload as typeof users.$inferInsert
  const rows = await db
    .insert(users)
    .values(insertValues)
    .returning()
  return rows[0]
}
