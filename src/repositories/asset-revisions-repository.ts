import { desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { assetRevisions } from "@/db/schema"

export type DbAssetRevision = typeof assetRevisions.$inferSelect

export async function listAssetRevisionsByAssetId(
  assetId: string,
): Promise<DbAssetRevision[]> {
  return db
    .select()
    .from(assetRevisions)
    .where(eq(assetRevisions.asset_id, assetId))
    .orderBy(desc(assetRevisions.version_number))
}

export async function getAssetRevisionById(
  id: string,
): Promise<DbAssetRevision | null> {
  const rows = await db
    .select()
    .from(assetRevisions)
    .where(eq(assetRevisions.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function insertAssetRevision(
  payload: typeof assetRevisions.$inferInsert,
): Promise<DbAssetRevision> {
  const insertValues = payload
  const rows = await db
    .insert(assetRevisions)
    .values(insertValues)
    .returning()
  return rows[0]
}

export async function deleteAssetRevisionsByAssetId(
  assetId: string,
): Promise<void> {
  await db.delete(assetRevisions).where(eq(assetRevisions.asset_id, assetId))
}
