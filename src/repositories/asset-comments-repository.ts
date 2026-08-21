import { asc, eq } from "drizzle-orm"
import { db } from "@/db"
import { assetComments } from "@/db/schema"

export type DbAssetComment = typeof assetComments.$inferSelect

export async function listCommentsByAssetId(
  assetId: string,
  options?: { limit?: number; offset?: number },
): Promise<DbAssetComment[]> {
  const query = db
    .select()
    .from(assetComments)
    .where(eq(assetComments.asset_id, assetId))
    .orderBy(asc(assetComments.created_at))

  const limit = options?.limit
  const offset = options?.offset
  const result =
    limit !== undefined
      ? await query.limit(Math.max(limit, 1)).offset(Math.max(offset ?? 0, 0))
      : await query
  return result
}

export async function getCommentById(
  commentId: string,
): Promise<DbAssetComment | null> {
  const rows = await db
    .select()
    .from(assetComments)
    .where(eq(assetComments.id, commentId))
    .limit(1)
  return rows[0] ?? null
}

export async function insertComment(
  payload: typeof assetComments.$inferInsert,
): Promise<DbAssetComment> {
  const insertValues = payload
  const rows = await db
    .insert(assetComments)
    .values(insertValues)
    .returning()
  return rows[0]
}

export async function updateComment(
  commentId: string,
  updates: Partial<typeof assetComments.$inferInsert>,
): Promise<DbAssetComment> {
  const setValues = updates
  const rows = await db
    .update(assetComments)
    .set(setValues)
    .where(eq(assetComments.id, commentId))
    .returning()
  return rows[0]
}

export async function deleteComment(commentId: string): Promise<void> {
  await db.delete(assetComments).where(eq(assetComments.id, commentId))
}
