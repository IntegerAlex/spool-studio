import { and, eq, gte, lte } from "drizzle-orm"
import { db } from "@/db"
import { assetPublicationRecords } from "@/db/schema"

export interface PublicationRecord {
  asset_id: string
  client_id: string
  client_name: string
  title: string
  type: string
  uploaded_at: string | null
  approved_at: string | null
  published_at: string | null
  publish_date: string | null
  publish_time: string | null
  created_at: string
  drive_file_url: string | null
}

function toISO(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function toDateString(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  const d = String(date.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function toTimeString(value: Date | string | null | undefined): string | null {
  if (!value) return null
  if (!(value instanceof Date)) return value
  const h = String(value.getUTCHours()).padStart(2, "0")
  const m = String(value.getUTCMinutes()).padStart(2, "0")
  const s = String(value.getUTCSeconds()).padStart(2, "0")
  return `${h}:${m}:${s}`
}

/**
 * Lists published assets for a given client within a date range.
 * Reads exclusively from the immutable asset_publication_records table, so the
 * report works even for assets that have since been deleted. The published_at
 * field is always populated in this table (captured at publication time), so the
 * date filter is applied in SQL for efficiency.
 */
export async function listClientAssetsForReport(
  clientId: string,
  startDate: Date,
  endDate: Date,
): Promise<PublicationRecord[]> {
  const rows = await db
    .select()
    .from(assetPublicationRecords)
    .where(
      and(
        eq(assetPublicationRecords.client_id, clientId),
        gte(assetPublicationRecords.published_at, startDate),
        lte(assetPublicationRecords.published_at, endDate),
      ),
    )

  return rows.map((row) => ({
    asset_id: row.asset_id,
    client_id: row.client_id ?? "",
    client_name: row.client_name ?? "",
    title: row.title ?? "",
    type: row.type ?? "poster",
    uploaded_at: toISO(row.uploaded_at),
    approved_at: toISO(row.approved_at),
    published_at: toISO(row.published_at),
    publish_date: toDateString(row.publish_date),
    publish_time: toTimeString(row.publish_time),
    created_at: toISO(row.created_at) ?? new Date().toISOString(),
    drive_file_url: row.drive_file_url ?? null,
  }))
}
