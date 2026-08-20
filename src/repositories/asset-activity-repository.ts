import { desc, eq } from "drizzle-orm"
import { db, type FlexibleInsert } from "@/db"
import { assetActivityLogs } from "@/db/schema"

export type DbAssetActivity = typeof assetActivityLogs.$inferSelect

export async function listActivityByAssetId(
  assetId: string,
  options?: { limit?: number },
): Promise<DbAssetActivity[]> {
  const query = db
    .select()
    .from(assetActivityLogs)
    .where(eq(assetActivityLogs.asset_id, assetId))
    .orderBy(desc(assetActivityLogs.created_at))

  const limit = options?.limit
  const result =
    limit !== undefined ? await query.limit(Math.max(limit, 1)) : await query
  return result
}

export async function listRecentActivity(options?: {
  limit?: number
}): Promise<DbAssetActivity[]> {
  const query = db
    .select()
    .from(assetActivityLogs)
    .orderBy(desc(assetActivityLogs.created_at))

  const limit = options?.limit
  const result =
    limit !== undefined ? await query.limit(Math.max(limit, 1)) : await query
  return result
}

export async function insertActivity(
  payload: FlexibleInsert<typeof assetActivityLogs.$inferInsert>,
): Promise<DbAssetActivity> {
  // SAFETY: payload is FlexibleInsert<$inferInsert>; string dates are valid for DB insert.
  const insertValues = payload as typeof assetActivityLogs.$inferInsert
  const rows = await db
    .insert(assetActivityLogs)
    .values(insertValues)
    .returning()
  return rows[0]
}
