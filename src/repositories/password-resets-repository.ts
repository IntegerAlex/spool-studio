import { desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { passwordResets } from "@/db/schema"

export type DbPasswordReset = typeof passwordResets.$inferSelect

export async function getPasswordResetByTokenHash(
  tokenHash: string,
): Promise<DbPasswordReset | null> {
  const rows = await db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.token_hash, tokenHash))
    .orderBy(desc(passwordResets.created_at))
    .limit(1)
  return rows[0] ?? null
}

export async function listPasswordResetsByUserId(
  userId: string,
): Promise<DbPasswordReset[]> {
  return db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.user_id, userId))
    .orderBy(desc(passwordResets.created_at))
}

export async function insertPasswordReset(
  payload: typeof passwordResets.$inferInsert,
): Promise<DbPasswordReset> {
  const insertValues = payload
  const rows = await db
    .insert(passwordResets)
    .values(insertValues)
    .returning()
  return rows[0]
}

export async function deletePasswordResetsByUserId(
  userId: string,
): Promise<void> {
  await db.delete(passwordResets).where(eq(passwordResets.user_id, userId))
}
