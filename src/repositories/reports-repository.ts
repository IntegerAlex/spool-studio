import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import { contentAssets } from "@/db/schema"

export type DbAsset = typeof contentAssets.$inferSelect

/**
 * Lists published assets for a given client within a date range.
 * The date range is applied against the resolved reporting date for each asset:
 * 1. published_at
 * 2. publish_date (fallback)
 * 3. created_at (fallback)
 */
export async function listClientAssetsForReport(
  clientId: string,
  startDate: Date,
  endDate: Date,
): Promise<DbAsset[]> {
  const assets = await db
    .select()
    .from(contentAssets)
    .where(
      and(
        eq(contentAssets.client_id, clientId),
        eq(contentAssets.status, "published"),
      ),
    )

  return assets.filter((asset) => {
    let resolvedDate: Date

    if (asset.published_at) {
      resolvedDate = new Date(asset.published_at)
    } else if (asset.publish_date) {
      const timePart = asset.publish_time ?? "00:00:00"
      resolvedDate = new Date(`${asset.publish_date}T${timePart}`)
    } else {
      resolvedDate = new Date(asset.created_at)
    }

    return resolvedDate >= startDate && resolvedDate <= endDate
  })
}
