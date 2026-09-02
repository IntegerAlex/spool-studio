import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm"
import { db } from "@/db"
import { contentAssets } from "@/db/schema"
import type { AssetStatus } from "@/types/index"

export type DbAsset = typeof contentAssets.$inferSelect

export type DbPortalAsset = Pick<
  DbAsset,
  | "id"
  | "title"
  | "type"
  | "status"
  | "thumbnail_url"
  | "drive_file_url"
  | "mime_type"
  | "file_size"
  | "created_at"
  | "updated_at"
>
export type DbAssetSummary = Pick<
  DbAsset,
  | "client_id"
  | "status"
  | "assigned_to"
  | "scheduled_at"
  | "publish_date"
  | "publish_time"
  | "published_at"
  | "approved_at"
  | "uploaded_at"
  | "created_at"
  | "type"
>

export type DbDashboardAssetSummary = Pick<
  DbAsset,
  "status" | "publish_date" | "publish_time" | "published_at"
>

export type DbKanbanAsset = Pick<
  DbAsset,
  | "id"
  | "client_id"
  | "title"
  | "type"
  | "status"
  | "mime_type"
  | "file_extension"
  | "thumbnail_url"
  | "assigned_to"
  | "publish_date"
  | "created_at"
  | "updated_at"
>

export async function listAssets(limit = 200): Promise<DbAsset[]> {
  const rows = await db
    .select()
    .from(contentAssets)
    .orderBy(desc(contentAssets.updated_at))
    .limit(limit)
  return rows
}

export async function listAssetsByStatuses(
  statuses: readonly AssetStatus[],
  limit = 200,
): Promise<DbAsset[]> {
  const rows = await db
    .select()
    .from(contentAssets)
    .where(inArray(contentAssets.status, [...statuses]))
    .orderBy(desc(contentAssets.updated_at))
    .limit(limit)
  return rows
}

export async function listAssetSummaries(): Promise<DbAssetSummary[]> {
  const rows = await db
    .select({
      client_id: contentAssets.client_id,
      status: contentAssets.status,
      assigned_to: contentAssets.assigned_to,
      scheduled_at: contentAssets.scheduled_at,
      publish_date: contentAssets.publish_date,
      publish_time: contentAssets.publish_time,
      published_at: contentAssets.published_at,
      approved_at: contentAssets.approved_at,
      uploaded_at: contentAssets.uploaded_at,
      created_at: contentAssets.created_at,
      type: contentAssets.type,
    })
    .from(contentAssets)
  return rows
}

export async function listDashboardAssetSummaries(): Promise<
  DbDashboardAssetSummary[]
> {
  const rows = await db
    .select({
      status: contentAssets.status,
      publish_date: contentAssets.publish_date,
      publish_time: contentAssets.publish_time,
      published_at: contentAssets.published_at,
    })
    .from(contentAssets)
  return rows
}

export async function listKanbanAssets(limit = 300): Promise<DbKanbanAsset[]> {
  const rows = await db
    .select({
      id: contentAssets.id,
      client_id: contentAssets.client_id,
      title: contentAssets.title,
      type: contentAssets.type,
      status: contentAssets.status,
      mime_type: contentAssets.mime_type,
      file_extension: contentAssets.file_extension,
      thumbnail_url: contentAssets.thumbnail_url,
      assigned_to: contentAssets.assigned_to,
      publish_date: contentAssets.publish_date,
      created_at: contentAssets.created_at,
      updated_at: contentAssets.updated_at,
    })
    .from(contentAssets)
    .orderBy(desc(contentAssets.updated_at))
    .limit(limit)
  return rows
}

export async function listAssetsByIds(
  ids: string[],
): Promise<
  Pick<
    DbAsset,
    | "id"
    | "title"
    | "type"
    | "status"
    | "publish_date"
    | "publish_time"
    | "published_at"
    | "thumbnail_url"
  >[]
> {
  if (!ids || ids.length === 0) return []
  const rows = await db
    .select({
      id: contentAssets.id,
      title: contentAssets.title,
      type: contentAssets.type,
      status: contentAssets.status,
      publish_date: contentAssets.publish_date,
      publish_time: contentAssets.publish_time,
      published_at: contentAssets.published_at,
      thumbnail_url: contentAssets.thumbnail_url,
    })
    .from(contentAssets)
    .where(inArray(contentAssets.id, ids))
    .orderBy(desc(contentAssets.updated_at))
  return rows
}

export async function getWeeklyCountsGroupedByClient(
  weekStartIso: string,
): Promise<{ client_id: string; weekly_count: number }[]> {
  const rows = await db
    .select({
      client_id: sql<string>`client_id`,
      weekly_count: sql<number>`weekly_count`,
    })
    .from(sql`clients_weekly_counts(${weekStartIso}::timestamptz)`)
  return rows
}

export async function listAssetsByClientId(
  clientId: string,
  limit = 200,
): Promise<DbAsset[]> {
  const rows = await db
    .select()
    .from(contentAssets)
    .where(eq(contentAssets.client_id, clientId))
    .orderBy(desc(contentAssets.updated_at))
    .limit(limit)
  return rows
}

export async function searchAssetsByTitle(
  term: string,
  limit = 5,
): Promise<Pick<DbAsset, "id" | "title" | "type">[]> {
  const rows = await db
    .select({
      id: contentAssets.id,
      title: contentAssets.title,
      type: contentAssets.type,
    })
    .from(contentAssets)
    .where(ilike(contentAssets.title, term))
    .orderBy(contentAssets.title)
    .limit(limit)
  return rows
}

export async function listPortalAssetsByClientId(
  clientId: string,
): Promise<DbPortalAsset[]> {
  return db
    .select({
      id: contentAssets.id,
      title: contentAssets.title,
      type: contentAssets.type,
      status: contentAssets.status,
      thumbnail_url: contentAssets.thumbnail_url,
      drive_file_url: contentAssets.drive_file_url,
      mime_type: contentAssets.mime_type,
      file_size: contentAssets.file_size,
      created_at: contentAssets.created_at,
      updated_at: contentAssets.updated_at,
    })
    .from(contentAssets)
    .where(
      and(
        eq(contentAssets.client_id, clientId),
        inArray(contentAssets.status, [
          "uploaded",
          "ready_for_review",
          "revision_requested",
          "approved",
        ]),
      ),
    )
    .orderBy(desc(contentAssets.created_at))
}

export async function getAssetById(assetId: string): Promise<DbAsset | null> {
  const rows = await db
    .select()
    .from(contentAssets)
    .where(eq(contentAssets.id, assetId))
    .limit(1)
  return rows[0] ?? null
}

export async function insertAsset(
  payload: typeof contentAssets.$inferInsert,
): Promise<DbAsset> {
  const insertValues = payload
  const rows = await db
    .insert(contentAssets)
    .values(insertValues)
    .returning()
  return rows[0]
}

export async function updateAsset(
  assetId: string,
  updates: Partial<typeof contentAssets.$inferInsert>,
): Promise<DbAsset> {
  const setValues = updates
  const rows = await db
    .update(contentAssets)
    .set(setValues)
    .where(eq(contentAssets.id, assetId))
    .returning()
  return rows[0]
}

export async function deleteAsset(assetId: string): Promise<void> {
  // Clear revision pointers first to avoid circular reference key violations
  await db
    .update(contentAssets)
    .set({ current_revision_id: null, latest_revision_id: null })
    .where(eq(contentAssets.id, assetId))
  await db.delete(contentAssets).where(eq(contentAssets.id, assetId))
}

export async function listPublishedAssetsByCycleId(
  cycleId: string,
): Promise<Pick<DbAsset, "type" | "status">[]> {
  return db
    .select({ type: contentAssets.type, status: contentAssets.status })
    .from(contentAssets)
    .where(
      and(
        eq(contentAssets.cycle_id, cycleId),
        inArray(contentAssets.status, ["published", "scheduled"]),
      ),
    )
}

export async function publishAssetWithRecord(
  assetId: string,
  updates: Partial<typeof contentAssets.$inferInsert>,
  publishedAt: string,
): Promise<void> {
  await db.execute(sql`
    select public.publish_asset_with_record(
      ${assetId}::uuid,
      ${JSON.stringify(updates)}::jsonb,
      ${publishedAt}::timestamptz
    )
  `)
}


