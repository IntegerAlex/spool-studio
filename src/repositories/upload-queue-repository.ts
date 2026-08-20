import { and, desc, eq } from "drizzle-orm"
import { db, type FlexibleInsert } from "@/db"
import { contentAssets, uploadQueue } from "@/db/schema"

export type DbUploadQueue = typeof uploadQueue.$inferSelect

export type DbUploadQueueListItem = Pick<
  DbUploadQueue,
  | "id"
  | "asset_id"
  | "scheduled_date"
  | "platform"
  | "status"
  | "caption"
  | "hashtags"
  | "created_at"
>

export async function listUploadQueue(): Promise<DbUploadQueue[]> {
  return db
    .select()
    .from(uploadQueue)
    .orderBy(desc(uploadQueue.created_at))
}

export async function getUploadQueueItemById(
  id: string,
): Promise<DbUploadQueue | null> {
  const rows = await db
    .select()
    .from(uploadQueue)
    .where(eq(uploadQueue.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function getUploadQueueItemByAssetId(
  assetId: string,
): Promise<DbUploadQueue | null> {
  const rows = await db
    .select()
    .from(uploadQueue)
    .where(eq(uploadQueue.asset_id, assetId))
    .limit(1)
  return rows[0] ?? null
}

export async function insertUploadQueueItem(
  payload: FlexibleInsert<typeof uploadQueue.$inferInsert>,
): Promise<DbUploadQueue> {
  // SAFETY: payload is FlexibleInsert<$inferInsert>; values are valid for DB insert.
  const insertValues = payload as typeof uploadQueue.$inferInsert
  const rows = await db
    .insert(uploadQueue)
    .values(insertValues)
    .returning()
  return rows[0]
}

export async function updateUploadQueueItem(
  id: string,
  updates: Partial<FlexibleInsert<typeof uploadQueue.$inferInsert>>,
): Promise<DbUploadQueue> {
  // SAFETY: updates is Partial<FlexibleInsert<$inferInsert>>; values valid for DB update.
  const setValues = updates as Partial<typeof uploadQueue.$inferInsert>
  const rows = await db
    .update(uploadQueue)
    .set(setValues)
    .where(eq(uploadQueue.id, id))
    .returning()
  return rows[0]
}

export async function deleteUploadQueueItem(id: string): Promise<void> {
  await db.delete(uploadQueue).where(eq(uploadQueue.id, id))
}

export async function deleteUploadQueueItemsByAssetId(
  assetId: string,
): Promise<void> {
  await db.delete(uploadQueue).where(eq(uploadQueue.asset_id, assetId))
}

export async function listUploadQueueForUser(
  userId: string,
  limit = 200,
): Promise<DbUploadQueueListItem[]> {
  return db
    .select({
      id: uploadQueue.id,
      asset_id: uploadQueue.asset_id,
      scheduled_date: uploadQueue.scheduled_date,
      platform: uploadQueue.platform,
      status: uploadQueue.status,
      caption: uploadQueue.caption,
      hashtags: uploadQueue.hashtags,
      created_at: uploadQueue.created_at,
    })
    .from(uploadQueue)
    .innerJoin(contentAssets, eq(contentAssets.id, uploadQueue.asset_id))
    .where(eq(contentAssets.created_by, userId))
    .orderBy(uploadQueue.scheduled_date)
    .limit(limit)
}

export async function getOwnedUploadQueueItem(
  id: string,
  userId: string,
): Promise<Pick<DbUploadQueue, "id"> | null> {
  const rows = await db
    .select({ id: uploadQueue.id })
    .from(uploadQueue)
    .innerJoin(contentAssets, eq(contentAssets.id, uploadQueue.asset_id))
    .where(and(eq(uploadQueue.id, id), eq(contentAssets.created_by, userId)))
    .limit(1)
  return rows[0] ?? null
}
