import { desc, eq } from "drizzle-orm"
import { db, type FlexibleInsert } from "@/db"
import { uploadSessions } from "@/db/schema"

export type DbUploadSession = typeof uploadSessions.$inferSelect

export async function getUploadSessionById(
  id: string,
): Promise<DbUploadSession | null> {
  const rows = await db
    .select()
    .from(uploadSessions)
    .where(eq(uploadSessions.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function listUploadSessionsByAssetId(
  assetId: string,
): Promise<DbUploadSession[]> {
  return db
    .select()
    .from(uploadSessions)
    .where(eq(uploadSessions.asset_id, assetId))
    .orderBy(desc(uploadSessions.created_at))
}

export async function insertUploadSession(
  payload: FlexibleInsert<typeof uploadSessions.$inferInsert>,
): Promise<DbUploadSession> {
  // SAFETY: payload is FlexibleInsert<$inferInsert>; values are valid for DB insert.
  const insertValues = payload as typeof uploadSessions.$inferInsert
  const rows = await db
    .insert(uploadSessions)
    .values(insertValues)
    .returning()
  return rows[0]
}

export async function updateUploadSession(
  id: string,
  updates: Partial<FlexibleInsert<typeof uploadSessions.$inferInsert>>,
): Promise<DbUploadSession> {
  // SAFETY: updates is Partial<FlexibleInsert<$inferInsert>>; values valid for DB update.
  const setValues = updates as Partial<typeof uploadSessions.$inferInsert>
  const rows = await db
    .update(uploadSessions)
    .set(setValues)
    .where(eq(uploadSessions.id, id))
    .returning()
  return rows[0]
}

export async function deleteUploadSession(id: string): Promise<void> {
  await db.delete(uploadSessions).where(eq(uploadSessions.id, id))
}
