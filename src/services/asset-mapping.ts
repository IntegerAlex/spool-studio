import { getPresignedDownloadUrl } from "@/integrations/r2/r2-service"
import { sanitizeFileUrl } from "@/lib/file-url"
import { getAssetById } from "@/repositories/assets-repository"
import { listAssetRevisionsByAssetId } from "@/repositories/asset-revisions-repository"
import type { Json } from "@/types"
import type { Asset, AssetRevision } from "@/types/index"

type DbAsset = NonNullable<Awaited<ReturnType<typeof getAssetById>>>
type DbAssetRevision = Awaited<ReturnType<typeof listAssetRevisionsByAssetId>>[number]

type ScheduledAtParts = {
  publishDate: string | null
  publishTime: string | null
}

export function splitScheduledAt(value?: string | null): ScheduledAtParts {
  if (!value) {
    return { publishDate: null, publishTime: null }
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return { publishDate: null, publishTime: null }
  }

  return {
    publishDate: parsed.toISOString().slice(0, 10),
    publishTime: parsed.toISOString().slice(11, 19),
  }
}

export function combinePublishDateTime(
  publishDate?: string | null,
  publishTime?: string | null,
  scheduledAt?: string | Date | null,
): Date | null {
  if (scheduledAt) {
    const fallback = new Date(scheduledAt)
    if (!Number.isNaN(fallback.getTime())) {
      return fallback
    }
  }

  if (!publishDate) {
    return null
  }

  const parsed = new Date(`${publishDate}T${publishTime ?? "00:00:00"}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

// Drizzle timestamp columns require Date objects (mapToDriverValue calls
// .toISOString()); coerce strings/null safely before any insert/update.
export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null
  }
  const parsed = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export async function mapAsset(
  asset: DbAsset | null,
): Promise<Asset | null> {
  if (!asset) {
    return null
  }

  const scheduledAt = combinePublishDateTime(
    asset.publish_date,
    asset.publish_time,
    asset.scheduled_at,
  )

  // SAFETY: drive_file_id is the R2 object key for uploads; presign a
  // time-limited GET so private objects stay private (no public bucket).
  const fileUrl = asset.drive_file_id
    ? await getPresignedDownloadUrl(asset.drive_file_id)
    : (asset.drive_file_url ?? undefined)

  // Stored thumbnail URLs pointing at dead bases are unusable; drop them.
  const thumbnailUrl = sanitizeFileUrl(asset.thumbnail_url)

  return {
    id: asset.id,
    clientId: asset.client_id,
    title: asset.title,
    description: undefined,
    type: asset.type,
    status: asset.status,
    mimeType: asset.mime_type ?? undefined,
    fileSize: asset.file_size ?? undefined,
    fileExtension: asset.file_extension ?? undefined,
    uploadedAt: asset.uploaded_at ? new Date(asset.uploaded_at) : null,
    uploadedBy: asset.uploaded_by ?? undefined,
    driveFileId: asset.drive_file_id ?? undefined,
    fileUrl,
    driveFileUrl: fileUrl,
    thumbnailUrl,
    mediaWidth: asset.media_width ?? undefined,
    mediaHeight: asset.media_height ?? undefined,
    durationSeconds: asset.duration_seconds ?? undefined,
    createdBy: asset.created_by,
    createdAt: new Date(asset.created_at),
    updatedAt: new Date(asset.updated_at),
    scheduledAt,
    publishDate: asset.publish_date ?? null,
    publishTime: asset.publish_time ?? null,
    scheduledBy: asset.scheduled_by ?? null,
    publishedAt: asset.published_at ? new Date(asset.published_at) : null,
    approvedAt: asset.approved_at ? new Date(asset.approved_at) : null,
    approvedBy: asset.approved_by ?? null,
    assignedTo: asset.assigned_to ? [asset.assigned_to] : [],
    revisions: [],
    currentRevisionId: asset.current_revision_id ?? undefined,
    latestRevision: undefined,
    revisionCount: asset.revision_count ?? undefined,
    comments: [],
  }
}

export async function mapAssetRevisions(
  revisions: DbAssetRevision[],
): Promise<AssetRevision[]> {
  return Promise.all(
    revisions.map(async (rev) => ({
      id: rev.id,
      assetId: rev.asset_id,
      versionNumber: rev.version_number,
      uploadedBy: rev.uploaded_by ?? undefined,
      uploadedAt: new Date(rev.uploaded_at),
      driveFileId: rev.drive_file_id,
      // SAFETY: drive_file_id is the R2 object key; presign a time-limited GET.
      driveFileUrl: rev.drive_file_id
        ? await getPresignedDownloadUrl(rev.drive_file_id)
        : (rev.drive_file_url ?? undefined),
      fileSize: rev.file_size ?? undefined,
      mimeType: rev.mime_type ?? undefined,
      mediaWidth: rev.media_width ?? undefined,
      mediaHeight: rev.media_height ?? undefined,
      durationSeconds: rev.duration_seconds ?? undefined,
      changeNote: rev.change_note ?? undefined,
      // SAFETY: this cast is safe because the value already conforms to the asserted type.
      metadata: (rev.metadata as Record<string, Json>) ?? undefined,
      createdAt: new Date(rev.created_at),
    })),
  )
}
