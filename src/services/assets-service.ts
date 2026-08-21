import { eq, sql } from "drizzle-orm"
import { db } from "@/db"
import { assetRevisions, contentAssets } from "@/db/schema"
import { deleteFile, uploadFile } from "@/integrations/r2/r2-service"
import { extractAssetMetadata } from "@/lib/asset-metadata"
import {
  canTransitionStatus,
  canUploadRevisionFromStatus,
} from "@/lib/asset-workflow"
import { getCurrentUser } from "@/lib/auth"
import { emitEvent } from "@/lib/event-bus"
import {
  sendAssetUploadNotification,
  sendDesignerNotification,
  sendRevisionUploadNotification,
} from "@/lib/notifications/mailgun"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { listCommentsByAssetId } from "@/repositories/asset-comments-repository"
import {
  deleteAsset as deleteAssetRow,
  getAssetById,
  insertAsset,
  listAssets,
  listAssetsByClientId,
  listAssetsByStatuses,
  listRevisionsByAssetId,
  updateAsset as updateAssetRow,
} from "@/repositories/assets-repository"
import { getClientById } from "@/repositories/clients-repository"
import { getUserById } from "@/repositories/users-repository"
import { logAssetActivity } from "@/services/activity-service"
import { logAuditEvent } from "@/services/audit-log-service"
import { getOrCreateCurrentUserProfile } from "@/services/users-service"
import {
  getActiveCycleForClientService,
} from "@/services/service-cycles-service"
import {
  getNextAssetNumber,
  generateAssetTitle,
  extractClientShortForm,
} from "@/services/numbering-service"
import type { AssetStatus, AssetType, Json } from "@/types"
import type { Asset, AssetRevision } from "@/types/index"

export interface AssetInput {
  clientId: string
  title: string
  type: AssetType
  status?: AssetStatus
  driveFileUrl?: string
  thumbnailUrl?: string
  assignedTo?: string | null
  scheduledAt?: string | null
  publishDate?: string | null
  publishTime?: string | null
  scheduledBy?: string | null
  publishedAt?: string | null
  approvedAt?: string | null
  approvedBy?: string | null
  recurrence?: Json | null
  cycleId?: string | null
  assetNumber?: number | null
}

type ScheduledAtParts = {
  publishDate: string | null
  publishTime: string | null
}

function splitScheduledAt(value?: string | null): ScheduledAtParts {
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

function combinePublishDateTime(
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
function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null
  }
  const parsed = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function mapAsset(
  asset: Awaited<ReturnType<typeof getAssetById>>,
): Asset | null {
  if (!asset) {
    return null
  }

  const scheduledAt = combinePublishDateTime(
    asset.publish_date,
    asset.publish_time,
    asset.scheduled_at,
  )

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
    fileUrl: asset.drive_file_url ?? undefined,
    driveFileUrl: asset.drive_file_url ?? undefined,
    thumbnailUrl: asset.thumbnail_url ?? undefined,
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

function mapAssetRevisions(
  revisions: Awaited<ReturnType<typeof listRevisionsByAssetId>>,
): AssetRevision[] {
  return revisions.map((rev) => ({
    id: rev.id,
    assetId: rev.asset_id,
    versionNumber: rev.version_number,
    uploadedBy: rev.uploaded_by ?? undefined,
    uploadedAt: new Date(rev.uploaded_at),
    driveFileId: rev.drive_file_id,
    driveFileUrl: rev.drive_file_url ?? undefined,
    fileSize: rev.file_size ?? undefined,
    mimeType: rev.mime_type ?? undefined,
    mediaWidth: rev.media_width ?? undefined,
    mediaHeight: rev.media_height ?? undefined,
    durationSeconds: rev.duration_seconds ?? undefined,
    changeNote: rev.change_note ?? undefined,
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    metadata: (rev.metadata as Record<string, Json>) ?? undefined,
    createdAt: new Date(rev.created_at),
  }))
}

function logUploadFailure(
  stage: string,
  // oxlint-disable-next-line anti-slop/no-unknown-parameters  // external input at boundary (arbitrary error)
  error: unknown,
  assetId: string,
  extra: Record<string, Json> = {},
) {
  const message =
    error instanceof Error ? error.message : "Unknown upload error"
  const stack = error instanceof Error ? (error.stack ?? null) : null

  console.error("[upload][failure]", {
    assetId,
    stage,
    message,
    stack,
    ...extra,
  })
}

function logAssetStatusTransition(
  assetId: string,
  previousStatus: AssetStatus,
  nextStatus: AssetStatus,
  triggerSource: string,
) {
  console.info("[asset][status-transition]", {
    assetId,
    previousStatus,
    nextStatus,
    triggerSource,
  })
}

async function transitionAssetStatus(
  assetId: string,
  nextStatus: AssetStatus,
  _triggerSource: string,
): Promise<void> {
  const currentAsset = await getAssetById(assetId)
  if (!currentAsset) {
    throw new Error("Asset not found")
  }

  if (!canTransitionStatus(currentAsset.status, nextStatus)) {
    throw new Error(
      `Invalid status transition from ${currentAsset.status} to ${nextStatus}`,
    )
  }

  if (currentAsset.status !== nextStatus) {
  }

  await updateAssetRow(assetId, { status: nextStatus })

  emitEvent({
    type: "asset:status-changed",
    userId: currentAsset.created_by ?? undefined,
    payload: { assetId, previousStatus: currentAsset.status, nextStatus },
  })
}

export function getAssetR2Key(
  clientId: string,
  assetId: string,
  fileName: string,
): string {
  return `clients/${clientId}/assets/${assetId}/${fileName}`
}

export async function getAssets(limit = 200): Promise<Asset[]> {
  try {
    const rows = await listAssets(limit)
    return rows
      .map((asset) => mapAsset(asset))
      .filter((asset): asset is Asset => Boolean(asset))
  } catch (error) {
    logProductionRuntimeError("assets-loader", error)
    return []
  }
}

export async function getAssetsByStatuses(
  statuses: readonly AssetStatus[],
  limit = 200,
): Promise<Asset[]> {
  try {
    const rows = await listAssetsByStatuses(statuses, limit)
    return rows
      .map((asset) => mapAsset(asset))
      .filter((asset): asset is Asset => Boolean(asset))
  } catch (error) {
    logProductionRuntimeError("assets-by-statuses-loader", error)
    return []
  }
}

export async function getAssetsByClientId(clientId: string, limit = 200): Promise<Asset[]> {
  try {
    const rows = await listAssetsByClientId(clientId, limit)
    return rows
      .map((asset) => mapAsset(asset))
      .filter((asset): asset is Asset => Boolean(asset))
  } catch (error) {
    logProductionRuntimeError("assets-by-client-loader", error, { clientId })
    return []
  }
}

export async function getAssetDetail(assetId: string): Promise<Asset | null> {
  try {
    const row = await getAssetById(assetId)
    const mapped = mapAsset(row)
    if (!mapped) return null
    try {
      const revisions = await listRevisionsByAssetId(assetId)
      mapped.revisions = mapAssetRevisions(revisions)
      // populate revision pointers/count from asset row
      mapped.currentRevisionId = row?.current_revision_id ?? undefined
      mapped.revisionCount = row?.revision_count ?? mapped.revisions.length
      if (row?.latest_revision_id) {
        const latest = revisions.find((r) => r.id === row.latest_revision_id)
        if (latest) {
          mapped.latestRevision = {
            id: latest.id,
            assetId: latest.asset_id,
            versionNumber: latest.version_number,
            uploadedBy: latest.uploaded_by ?? undefined,
            uploadedAt: new Date(latest.uploaded_at),
            driveFileId: latest.drive_file_id,
            driveFileUrl: latest.drive_file_url ?? undefined,
            fileSize: latest.file_size ?? undefined,
            mimeType: latest.mime_type ?? undefined,
            mediaWidth: latest.media_width ?? undefined,
            mediaHeight: latest.media_height ?? undefined,
            durationSeconds: latest.duration_seconds ?? undefined,
            changeNote: latest.change_note ?? undefined,
            // SAFETY: this cast is safe because the value already conforms to the asserted type.
            metadata: (latest.metadata as Record<string, Json>) ?? undefined,
            createdAt: new Date(latest.created_at),
          }
        }
      }
    } catch (error) {
      logProductionRuntimeError("asset-revisions-loader", error, { assetId })
      mapped.revisions = []
    }

    return mapped
  } catch (error) {
    logProductionRuntimeError("asset-detail-loader", error, { assetId })
    return null
  }
}

export async function getAssetSummary(assetId: string): Promise<Asset | null> {
  try {
    const row = await getAssetById(assetId)
    return mapAsset(row)
  } catch (error) {
    logProductionRuntimeError("asset-summary-loader", error, { assetId })
    return null
  }
}

export async function getAssetRevisions(
  assetId: string,
): Promise<AssetRevision[]> {
  try {
    const revisions = await listRevisionsByAssetId(assetId)
    return mapAssetRevisions(revisions)
  } catch (error) {
    logProductionRuntimeError("asset-revisions-loader", error, { assetId })
    return []
  }
}

export async function setAssetCurrentRevision(
  assetId: string,
  revisionId: string,
): Promise<void> {
  // Ensure the revision belongs to the asset
  const revs = await db
    .select({ id: assetRevisions.id, asset_id: assetRevisions.asset_id })
    .from(assetRevisions)
    .where(eq(assetRevisions.id, revisionId))
    .limit(1)
  const rev = revs[0]
  if (!rev || rev.asset_id !== assetId) {
    throw new Error("Revision not found for asset")
  }

  await updateAssetRow(assetId, { current_revision_id: revisionId })
  try {
    await logAssetActivity({
      assetId,
      action: "revision_activated",
      metadata: { revisionId },
    })
  } catch {
    // non-blocking
  }
}

export async function createAsset(input: AssetInput): Promise<Asset> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }

  await getOrCreateCurrentUserProfile()

  if (input.status === "scheduled" && !input.scheduledAt) {
    throw new Error("Scheduled assets require a scheduled date")
  }

  if (input.assignedTo) {
    const assignedUser = await getUserById(input.assignedTo)
    if (!assignedUser) {
      throw new Error("Assigned user not found")
    }
  }

  const scheduledFields = splitScheduledAt(input.scheduledAt)

  // Auto-numbering: if title is empty, derive it from the active service cycle.
  let finalTitle = input.title
  let finalCycleId = input.cycleId ?? null
  let finalAssetNumber = input.assetNumber ?? null

  if (!finalTitle || finalTitle.trim() === "") {
    const activeCycle = await getActiveCycleForClientService(input.clientId)
    if (!activeCycle) {
      throw new Error(
        "No active service cycle found. Please contact the administrator to create one.",
      )
    }

    const assetNumber = await getNextAssetNumber(activeCycle.id, input.type)
    const clientRecord = await getClientById(input.clientId)
    const shortForm = extractClientShortForm(clientRecord?.name ?? "XX")

    finalTitle = generateAssetTitle(
      shortForm,
      activeCycle.startDate,
      input.type,
      assetNumber,
    )
    finalCycleId = activeCycle.id
    finalAssetNumber = assetNumber
  }

  const record = await insertAsset({
    client_id: input.clientId,
    title: finalTitle,
    type: input.type,
    status: input.status ?? "draft",
    drive_file_url: input.driveFileUrl ?? null,
    thumbnail_url: input.thumbnailUrl ?? null,
    assigned_to: input.assignedTo ?? null,
    created_by: user.id,
    scheduled_at: toDate(input.scheduledAt),
    publish_date: input.publishDate ?? scheduledFields.publishDate,
    publish_time: input.publishTime ?? scheduledFields.publishTime,
    scheduled_by: input.scheduledBy ?? (input.scheduledAt ? user.id : null),
    published_at: toDate(input.publishedAt),
    approved_at: toDate(input.approvedAt),
    approved_by: input.approvedBy ?? null,
    cycle_id: finalCycleId,
    asset_number: finalAssetNumber,
  })

  const storedRecord = record

  const mapped = mapAsset(storedRecord)
  if (!mapped) {
    throw new Error("Failed to map asset")
  }

  try {
    await logAssetActivity({
      assetId: mapped.id,
      action: "asset_created",
      metadata: {
        title: mapped.title,
        type: mapped.type,
        status: mapped.status,
      },
    })
  } catch {
    // Activity logging should not block asset creation.
  }

  try {
    await logAuditEvent({
      action: "asset_created",
      entityType: "asset",
      entityId: mapped.id,
      entityName: mapped.title ?? "Untitled",
      metadata: {
        type: mapped.type,
        status: mapped.status,
        clientId: mapped.clientId,
      },
    })
  } catch {
    // Audit logging should not block asset creation.
  }

  return mapped
}

export interface AssetUploadResult {
  asset: Asset
  upload: {
    r2Key: string
    fileUrl: string
    mimeType: string
    fileSize: number
    uploadStatus: "uploaded"
  }
}

export interface UploadFinalizationMetadata {
  mimeType: string
  fileSize: number
  uploadStatus: "uploaded"
  thumbnailLink?: string | null
  mediaWidth?: number | null
  mediaHeight?: number | null
  durationSeconds?: number | null
}

export interface AssetUploadFinalizationInput {
  fileName: string
  uploadResult: {
    key: string
    url: string
  } & UploadFinalizationMetadata
}

export async function finalizeAssetUpload(
  assetId: string,
  input: AssetUploadFinalizationInput,
): Promise<AssetUploadResult> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }

  await getOrCreateCurrentUserProfile()

  console.info(
    "[upload][auth] " +
      JSON.stringify({
        assetId,
        authSource: "service-cookie-store",
        userExists: Boolean(user),
        sessionExists: true,
        cookiesPresent: "unknown",
      }),
  )

  await getOrCreateCurrentUserProfile()

  const asset = await getAssetById(assetId)
  if (!asset) {
    throw new Error("Asset not found")
  }

  let clientName = asset.client_id
  try {
    const client = await getClientById(asset.client_id)
    clientName = client?.name ?? clientName
  } catch {
    // Non-blocking: email can fall back to the client id.
  }

  const isRevisionUpload = Boolean(
    asset.drive_file_id || asset.uploaded_at || (asset.revision_count ?? 0) > 0,
  )
  let revisionNotificationVersion: number | null = null

  if (!isRevisionUpload) {
    await transitionAssetStatus(assetId, "uploading", "upload-start")
  }

  console.info("[upload][asset-check]", {
    assetId,
    clientId: asset.client_id,
    assetType: asset.type,
    fileName: input.fileName,
    mimeType: input.uploadResult.mimeType || "application/octet-stream",
    fileSize: input.uploadResult.fileSize,
  })

  const uploadedAt = new Date().toISOString()
  const fileExtension = input.fileName.includes(".")
    ? (input.fileName.split(".").pop()?.toLowerCase() ?? null)
    : null

  const updates: Parameters<typeof updateAssetRow>[1] = {
    drive_file_id: input.uploadResult.key,
    drive_file_url: input.uploadResult.url,
    thumbnail_url:
      input.uploadResult.thumbnailLink ?? asset.thumbnail_url ?? null,
    mime_type: input.uploadResult.mimeType,
    file_size: input.uploadResult.fileSize,
    file_extension: fileExtension,
    uploaded_at: toDate(uploadedAt),
    uploaded_by: user.id,
    media_width: input.uploadResult.mediaWidth ?? null,
    media_height: input.uploadResult.mediaHeight ?? null,
    duration_seconds: input.uploadResult.durationSeconds ?? null,
  }

  if (!isRevisionUpload) {
    logAssetStatusTransition(assetId, "uploading", "uploaded", "upload-success")
    updates.status = "uploaded"
  } else {
    console.info("[asset][revision-upload]", {
      assetId,
      statusPreserved: asset.status,
    })
  }

  const updated = await updateAssetRow(assetId, updates)
  const persisted = await getAssetById(assetId)
  const mapped = mapAsset(persisted ?? updated)

  if (!mapped) {
    throw new Error("Failed to map asset")
  }

  console.info("[asset][metadata-extraction]", {
    assetId,
    mediaType: input.uploadResult.mimeType.startsWith("video/")
      ? "video"
      : input.uploadResult.mimeType.startsWith("image/")
        ? "image"
        : "other",
    extractedFields: {
      mimeType: updates.mime_type,
      fileSize: updates.file_size,
      fileExtension: updates.file_extension,
      uploadedAt: updates.uploaded_at,
      uploadedBy: updates.uploaded_by,
      driveFileId: updates.drive_file_id,
      driveFileUrl: updates.drive_file_url,
      thumbnailUrl: updates.thumbnail_url,
      mediaWidth: updates.media_width,
      mediaHeight: updates.media_height,
      durationSeconds: updates.duration_seconds,
    },
    extractionDurationMs: 0,
    partialFailures: [],
  })

  // Create an immutable revision record for this upload and update the asset's revision pointers
  try {
    const persistedAfterUpdate = persisted
    const currentCount = persistedAfterUpdate?.revision_count ?? 0
    const versionNumber = (currentCount ?? 0) + 1

    const revisionInsert = {
      asset_id: assetId,
      version_number: versionNumber,
      uploaded_by: user.id,
      uploaded_at: toDate(uploadedAt),
      drive_file_id: input.uploadResult.key,
      drive_file_url: input.uploadResult.url,
      file_size: input.uploadResult.fileSize,
      mime_type: input.uploadResult.mimeType,
      media_width: input.uploadResult.mediaWidth ?? null,
      media_height: input.uploadResult.mediaHeight ?? null,
      duration_seconds: input.uploadResult.durationSeconds ?? null,
      change_note: null,
      metadata: {
        fileName: input.fileName,
        mimeType: input.uploadResult.mimeType,
        fileSize: input.uploadResult.fileSize,
        mediaWidth: input.uploadResult.mediaWidth ?? null,
        mediaHeight: input.uploadResult.mediaHeight ?? null,
        durationSeconds: input.uploadResult.durationSeconds ?? null,
      },
    } as const

    let revisionData: { id: string } | undefined
    try {
      const inserted = await db
        .insert(assetRevisions)
        // oxlint-disable-next-line anti-slop/no-chained-type-assertions, anti-slop/require-safety-comment-for-type-assertion  // const-literal insert row at DB boundary
        .values(revisionInsert as unknown as typeof assetRevisions.$inferInsert)
        .returning({ id: assetRevisions.id })
      revisionData = inserted[0]
    } catch (revisionError) {
      console.error("[revision][create][failed]", {
        assetId,
        error: revisionError,
      })
    }
    if (revisionData) {
      revisionNotificationVersion = versionNumber

      // update asset pointers to reference this new revision
      await updateAssetRow(assetId, {
        latest_revision_id: revisionData.id,
        current_revision_id: revisionData.id,
        revision_count: versionNumber,
      })

      try {
        const shouldLogRevision =
          asset.status === "revision_requested" || isRevisionUpload
        if (shouldLogRevision) {
          await logAssetActivity({
            assetId,
            action: "revision_created",
            metadata: {
              assetId,
              revisionId: revisionData.id,
              revisionNumber: versionNumber,
              r2Key: input.uploadResult.key,
            },
          })
        }
      } catch {
        // non-blocking
      }
    }
  } catch (error) {
    console.error("[revision][create][error]", { assetId, error })
  }

  try {
    await logAssetActivity({
      assetId,
      action: "file_uploaded",
      metadata: {
        r2Key: input.uploadResult.key,
        fileUrl: input.uploadResult.url,
        mimeType: input.uploadResult.mimeType,
        fileSize: input.uploadResult.fileSize,
        uploadStatus: input.uploadResult.uploadStatus,
      },
    })
  } catch (error) {
    logUploadFailure("metadata-persistence", error, assetId, {
      clientId: asset.client_id,
      r2Key: input.uploadResult.key,
      fileUrl: input.uploadResult.url,
      mimeType: input.uploadResult.mimeType,
      fileSize: input.uploadResult.fileSize,
      activity: "file_uploaded",
    })
  }

  console.info("[upload][success]", {
    assetId,
    clientId: asset.client_id,
    r2Key: input.uploadResult.key,
    fileUrl: input.uploadResult.url,
    mimeType: input.uploadResult.mimeType,
    fileSize: input.uploadResult.fileSize,
    uploadStatus: input.uploadResult.uploadStatus,
  })

  if (isRevisionUpload) {
    if (revisionNotificationVersion != null) {
      void sendRevisionUploadNotification({
        assetId,
        assetTitle: asset.title,
        revisionVersion: revisionNotificationVersion,
        uploadedBy: {
          email: user.email,
          name: user.name ?? null,
        },
        uploadedAt,
      })
    }
  } else {
    void sendAssetUploadNotification({
      assetId,
      assetTitle: asset.title,
      clientName,
      assetType: asset.type,
      assetStatus: updates.status ?? asset.status,
      uploadedBy: {
        email: user.email,
        name: user.name ?? null,
      },
      uploadedAt,
    })
  }

  return {
    asset: mapped,
    upload: {
      r2Key: input.uploadResult.key,
      fileUrl: input.uploadResult.url,
      mimeType: input.uploadResult.mimeType,
      fileSize: input.uploadResult.fileSize,
      uploadStatus: input.uploadResult.uploadStatus,
    },
  }
}

export async function uploadAssetFile(
  assetId: string,
  file: File,
): Promise<AssetUploadResult> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }

  await getOrCreateCurrentUserProfile()

  console.info(
    "[upload][auth] " +
      JSON.stringify({
        assetId,
        authSource: "service-cookie-store",
        userExists: Boolean(user),
        sessionExists: true,
        cookiesPresent: "unknown",
      }),
  )

  await getOrCreateCurrentUserProfile()

  const asset = await getAssetById(assetId)
  if (!asset) {
    throw new Error("Asset not found")
  }

  let clientName = asset.client_id
  try {
    const client = await getClientById(asset.client_id)
    clientName = client?.name ?? clientName
  } catch {
    // Non-blocking: email can fall back to the client id.
  }

  const isRevisionUpload = Boolean(
    asset.drive_file_id || asset.uploaded_at || (asset.revision_count ?? 0) > 0,
  )
  let revisionNotificationVersion: number | null = null

  if (isRevisionUpload && !canUploadRevisionFromStatus(asset.status)) {
    throw new Error(
      `Cannot upload revision to an asset with status "${asset.status}"`,
    )
  }

  if (!isRevisionUpload) {
    await transitionAssetStatus(assetId, "uploading", "upload-start")
  }

  console.info("[upload][asset-check]", {
    assetId,
    clientId: asset.client_id,
    assetType: asset.type,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
  })

  try {
    const r2Key = getAssetR2Key(asset.client_id, assetId, file.name)
    const arrayBuffer = await file.arrayBuffer()

    const uploadResult = await uploadFile({
      key: r2Key,
      body: Buffer.from(arrayBuffer),
      contentType: file.type || "application/octet-stream",
      contentLength: file.size,
      metadata: {
        assetId,
        clientId: asset.client_id,
        fileName: file.name,
      },
    })

    const uploadedAt = new Date().toISOString()
    const fileExtension = file.name.includes(".")
      ? (file.name.split(".").pop()?.toLowerCase() ?? null)
      : null

    const updates: Parameters<typeof updateAssetRow>[1] = {
      drive_file_id: uploadResult.key,
      drive_file_url: uploadResult.url,
      thumbnail_url: asset.thumbnail_url ?? null,
      mime_type: file.type || "application/octet-stream",
      file_size: file.size,
      file_extension: fileExtension,
      uploaded_at: toDate(uploadedAt),
      uploaded_by: user.id,
    }

    if (!isRevisionUpload) {
      logAssetStatusTransition(
        assetId,
        "uploading",
        "uploaded",
        "upload-success",
      )
      updates.status = "uploaded"
    } else {
      console.info("[asset][revision-upload]", {
        assetId,
        statusPreserved: asset.status,
      })
    }

    const updated = await updateAssetRow(assetId, updates)
    const persisted = await getAssetById(assetId)
    let mapped = mapAsset(persisted ?? updated)

    if (!mapped) {
      throw new Error("Failed to map asset")
    }

    try {
      const metadata = await extractAssetMetadata({
        assetId,
        file,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        driveFileId: uploadResult.key,
        driveFileUrl: uploadResult.url,
        thumbnailUrl: asset.thumbnail_url ?? null,
        uploadedBy: user.id,
        uploadedAt,
      })

      await updateAssetRow(assetId, metadata.updates)
      const refreshed = await getAssetById(assetId)
      const refreshedMapped = mapAsset(refreshed)
      if (refreshedMapped) {
        mapped = refreshedMapped
      }
      try {
        const persistedAfterUpdate = refreshed ?? persisted
        const currentCount = persistedAfterUpdate?.revision_count ?? 0
        const versionNumber = (currentCount ?? 0) + 1

        const revisionInsert = {
          asset_id: assetId,
          version_number: versionNumber,
          uploaded_by: user.id,
          uploaded_at: toDate(uploadedAt),
          drive_file_id: uploadResult.key,
          drive_file_url: uploadResult.url,
          file_size: file.size,
          mime_type: file.type || "application/octet-stream",
          media_width: metadata.extractedFields.mediaWidth ?? null,
          media_height: metadata.extractedFields.mediaHeight ?? null,
          duration_seconds: metadata.extractedFields.durationSeconds ?? null,
          change_note: null,
          metadata: metadata.extractedFields,
        }

        let revisionData: { id: string } | undefined
        try {
          const inserted = await db
            .insert(assetRevisions)
            .values(
              // oxlint-disable-next-line anti-slop/no-chained-type-assertions, anti-slop/require-safety-comment-for-type-assertion  // insert row at DB boundary
              revisionInsert as unknown as typeof assetRevisions.$inferInsert,
            )
            .returning({ id: assetRevisions.id })
          revisionData = inserted[0]
        } catch (revisionError) {
          console.error("[revision][create][failed]", {
            assetId,
            error: revisionError,
          })
        }
        if (revisionData) {
          revisionNotificationVersion = versionNumber

          await updateAssetRow(assetId, {
            latest_revision_id: revisionData.id,
            current_revision_id: revisionData.id,
            revision_count: versionNumber,
          })

          try {
            console.log("[activity-log][revision]", {
              assetId,
              currentStatus: asset.status,
              eventType: "revision_created",
            })
            const shouldLogRevision =
              asset.status === "revision_requested" || isRevisionUpload
            if (shouldLogRevision) {
              await logAssetActivity({
                assetId,
                action: "revision_created",
                metadata: {
                  assetId,
                  revisionId: revisionData.id,
                  revisionNumber: versionNumber,
                  r2Key: uploadResult.key,
                },
              })
            }
          } catch {
            // non-blocking
          }
        }
      } catch (error) {
        console.error("[revision][create][error]", { assetId, error })
      }
    } catch (error) {
      logUploadFailure("metadata-extraction", error, assetId, {
        clientId: asset.client_id,
        mediaType: file.type.startsWith("video/")
          ? "video"
          : file.type.startsWith("image/")
            ? "image"
            : "other",
        triggerSource: "post-upload-enrichment",
      })
    }

    try {
      console.log("[activity-log][upload]", {
        assetId,
        currentStatus: mapped.status,
        eventType: "file_uploaded",
      })
      await logAssetActivity({
        assetId,
        action: "file_uploaded",
        metadata: {
          r2Key: uploadResult.key,
          fileUrl: uploadResult.url,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          uploadStatus: "uploaded",
        },
      })
    } catch (error) {
      logUploadFailure("metadata-persistence", error, assetId, {
        clientId: asset.client_id,
        r2Key: uploadResult.key,
        fileUrl: uploadResult.url,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        activity: "file_uploaded",
      })
    }

    console.info("[upload][success]", {
      assetId,
      clientId: asset.client_id,
      r2Key: uploadResult.key,
      fileUrl: uploadResult.url,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      uploadStatus: "uploaded",
    })

    if (isRevisionUpload) {
      if (revisionNotificationVersion != null) {
        void sendRevisionUploadNotification({
          assetId,
          assetTitle: asset.title,
          revisionVersion: revisionNotificationVersion,
          uploadedBy: {
            email: user.email,
            name: user.name ?? null,
          },
          uploadedAt,
        })
      }
    } else {
      void sendAssetUploadNotification({
        assetId,
        assetTitle: asset.title,
        clientName,
        assetType: asset.type,
        assetStatus: updates.status ?? asset.status,
        uploadedBy: {
          email: user.email,
          name: user.name ?? null,
        },
        uploadedAt,
      })
    }

    try {
      await logAuditEvent({
        action: isRevisionUpload ? "revision_uploaded" : "file_uploaded",
        entityType: "asset",
        entityId: assetId,
        entityName: asset.title ?? "Untitled",
        metadata: {
          fileName: file.name,
          r2Key: uploadResult.key,
          fileSize: file.size,
          isRevision: isRevisionUpload,
        },
      })
    } catch {
      // Audit logging should not block upload.
    }

    return {
      asset: mapped,
      upload: {
        r2Key: uploadResult.key,
        fileUrl: uploadResult.url,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        uploadStatus: "uploaded" as const,
      },
    }
  } catch (error) {
    try {
      const currentAsset = await getAssetById(assetId)
      if (
        !isRevisionUpload &&
        currentAsset &&
        currentAsset.status !== "failed" &&
        canTransitionStatus(currentAsset.status, "failed")
      ) {
        logAssetStatusTransition(
          assetId,
          currentAsset.status,
          "failed",
          "upload-failure",
        )
        await updateAssetRow(assetId, { status: "failed" })
      }
    } catch (rollbackError) {
      logUploadFailure("status-transition", rollbackError, assetId, {
        triggerSource: "upload-failure",
      })
    }

    logUploadFailure("upload-failure", error, assetId, {
      clientId: asset.client_id,
      triggerSource: "upload-failure",
    })
    throw error
  }
}

export async function updateAsset(
  assetId: string,
  input: Partial<AssetInput>,
): Promise<Asset> {
  const user = await getCurrentUser()

  if (user) {
    await getOrCreateCurrentUserProfile()
  }

  const existing = await getAssetById(assetId)
  if (!existing) {
    throw new Error("Asset not found")
  }

  if (input.status !== undefined) {
    if (!canTransitionStatus(existing.status, input.status)) {
      throw new Error("Invalid status transition")
    }

    const scheduledAt = input.scheduledAt ?? existing.scheduled_at
    if (input.status === "scheduled" && !scheduledAt) {
      throw new Error("Scheduled assets require a scheduled date")
    }
  }

  const updates: Partial<typeof contentAssets.$inferInsert> = {}
  if (input.clientId !== undefined) updates.client_id = input.clientId
  if (input.title !== undefined) updates.title = input.title
  if (input.type !== undefined) updates.type = input.type
  if (input.status !== undefined) updates.status = input.status
  if (input.driveFileUrl !== undefined)
    updates.drive_file_url = input.driveFileUrl
  if (input.thumbnailUrl !== undefined)
    updates.thumbnail_url = input.thumbnailUrl
  if (input.assignedTo !== undefined) updates.assigned_to = input.assignedTo
  if (input.scheduledAt !== undefined) {
    const scheduledFields = splitScheduledAt(input.scheduledAt)
    updates.scheduled_at = toDate(input.scheduledAt)
    updates.publish_date = scheduledFields.publishDate
    updates.publish_time = scheduledFields.publishTime
    updates.scheduled_by =
      input.scheduledBy ?? user?.id ?? existing.scheduled_by ?? null
  }
  if (input.publishDate !== undefined) updates.publish_date = input.publishDate
  if (input.publishTime !== undefined) updates.publish_time = input.publishTime
  if (input.scheduledBy !== undefined) updates.scheduled_by = input.scheduledBy
  if (input.publishedAt !== undefined)
    updates.published_at = toDate(input.publishedAt)
  if (input.approvedAt !== undefined)
    updates.approved_at = toDate(input.approvedAt)
  if (input.approvedBy !== undefined) updates.approved_by = input.approvedBy
  if (input.recurrence !== undefined) updates.recurrence = input.recurrence

  if (input.status === "approved") {
    updates.approved_at = toDate(input.approvedAt) ?? new Date()
    updates.approved_by =
      input.approvedBy ?? user?.id ?? existing.approved_by ?? null
  }

  if (input.status === "published") {
    updates.published_at = toDate(input.publishedAt) ?? new Date()
  }

  let record: Awaited<ReturnType<typeof getAssetById>>
  if (updates.status === "published") {
    // Atomic publication: apply all updates and create the immutable
    // publication record in a single transaction via the SQL function.
    const publishedAt =
      updates.published_at instanceof Date
        ? updates.published_at.toISOString()
        : (updates.published_at ?? new Date().toISOString())
    await db.execute(sql`
      select public.publish_asset_with_record(
        ${assetId}::uuid,
        ${JSON.stringify(updates)}::jsonb,
        ${publishedAt}::timestamptz
      )
    `)
    const refreshed = await getAssetById(assetId)
    if (!refreshed) {
      throw new Error("Asset not found after publication")
    }
    record = refreshed
  } else {
    record = await updateAssetRow(assetId, updates)
  }

  const mapped = mapAsset(record)
  if (!mapped) {
    throw new Error("Failed to map asset")
  }

  const statusChanged =
    input.status !== undefined && input.status !== existing.status
  const assignmentChanged =
    input.assignedTo !== undefined && input.assignedTo !== existing.assigned_to

  if (statusChanged) {
    logAssetStatusTransition(
      assetId,
      // SAFETY: this cast is safe because the value already conforms to the asserted type.
      existing.status as AssetStatus,
      // SAFETY: this cast is safe because the value already conforms to the asserted type.
      input.status as AssetStatus,
      "api-update",
    )

    emitEvent({
      type: "asset:status-changed",
      userId: user?.id,
      payload: {
        assetId,
        previousStatus: existing.status,
        nextStatus: input.status,
      },
    })

    try {
      await logAssetActivity({
        assetId,
        action: "status_changed",
        metadata: {
          from: existing.status ?? null,
          to: input.status ?? null,
        },
      })
    } catch {
      // Activity logging should not block updates.
    }
    try {
      await logAuditEvent({
        action: "status_changed",
        entityType: "asset",
        entityId: assetId,
        entityName: existing.title,
        metadata: { from: existing.status, to: input.status },
      })
    } catch {
      // Audit logging should not block updates.
    }
  } else if (input.title && input.title !== existing.title) {
    try {
      await logAuditEvent({
        action: "asset_updated",
        entityType: "asset",
        entityId: assetId,
        entityName: existing.title,
        metadata: { field: "title", from: existing.title, to: input.title },
      })
    } catch {
      // Audit logging should not block updates.
    }
  }

  if (assignmentChanged) {
    try {
      await logAssetActivity({
        assetId,
        action: "assignment_changed",
        metadata: {
          from: existing.assigned_to ?? null,
          to: input.assignedTo ?? null,
        },
      })
    } catch {
      // Activity logging should not block updates.
    }
  }

  return mapped
}

const approvalEligibleStatuses = new Set<AssetStatus>([
  "draft",
  "ready_for_review",
  "revision_requested",
])

export async function approveAsset(
  assetId: string,
  userId: string,
): Promise<Asset> {
  await getOrCreateCurrentUserProfile()
  const existing = await getAssetById(assetId)
  if (!existing) {
    throw new Error("Asset not found")
  }

  if (existing.status === "approved") {
    const mapped = mapAsset(existing)
    if (!mapped) {
      throw new Error("Failed to map asset")
    }
    return mapped
  }

  if (!approvalEligibleStatuses.has(existing.status)) {
    throw new Error("Asset is not eligible for approval")
  }

  if (!existing.drive_file_id) {
    throw new Error("Asset has no uploaded file and cannot be approved")
  }

  const approvedAt = new Date()
  const updated = await updateAssetRow(assetId, {
    status: "approved",
    approved_at: approvedAt,
    approved_by: userId,
  })

  const mapped = mapAsset(updated)
  if (!mapped) {
    throw new Error("Failed to map asset")
  }

  emitEvent({
    type: "asset:status-changed",
    userId,
    payload: {
      assetId,
      previousStatus: existing.status,
      nextStatus: "approved",
    },
  })

  try {
    await logAuditEvent({
      action: "asset_approved",
      entityType: "asset",
      entityId: assetId,
      entityName: existing.title ?? "Untitled",
      metadata: { from: existing.status, to: "approved" },
    })
  } catch {
    // Audit logging should not block approval.
  }

  return mapped
}

export async function rejectAsset(
  assetId: string,
  userId: string,
): Promise<Asset> {
  await getOrCreateCurrentUserProfile()
  const existing = await getAssetById(assetId)
  if (!existing) {
    throw new Error("Asset not found")
  }

  if (existing.status === "revision_requested") {
    const mapped = mapAsset(existing)
    if (!mapped) {
      throw new Error("Failed to map asset")
    }
    return mapped
  }

  if (!approvalEligibleStatuses.has(existing.status)) {
    throw new Error("Asset is not eligible for rejection")
  }

  const updated = await updateAssetRow(assetId, {
    status: "revision_requested",
    approved_at: null,
    approved_by: null,
  })

  // Handle Notifications
  try {
    if (existing.assigned_to) {
      const assignedDesigner = await getUserById(existing.assigned_to)

      // Do not send if the user rejecting is the assigned designer
      if (assignedDesigner?.email && userId !== assignedDesigner.id) {
        let clientName = "Unknown Client"
        if (existing.client_id) {
          const client = await getClientById(existing.client_id)
          if (client) {
            clientName = client.name
          }
        }

        const requestingUser = await getUserById(userId)

        // Fetch latest comment to include in the email
        let latestCommentText = null
        try {
          const comments = await listCommentsByAssetId(assetId, {
            limit: 1,
          })
          if (comments && comments.length > 0) {
            latestCommentText = comments[0].message
          }
        } catch {
          // non-blocking
        }

        void sendDesignerNotification({
          notificationType: "revision_requested",
          assetId: existing.id,
          assetTitle: existing.title,
          assetType: existing.type,
          clientId: existing.client_id,
          clientName,
          commentMessage: latestCommentText,
          designerId: assignedDesigner.id,
          designerEmail: assignedDesigner.email,
          designerName: assignedDesigner.full_name || null,
          requestedBy: {
            email: requestingUser?.email || "unknown",
            name: requestingUser?.full_name || null,
          },
          timestamp: new Date().toISOString(),
        })
      }
    }
  } catch (err) {
    console.error(
      "[assets-service] Failed to send designer notification on reject",
      err,
    )
  }

  const mapped = mapAsset(updated)
  if (!mapped) {
    throw new Error("Failed to map asset")
  }

  emitEvent({
    type: "asset:status-changed",
    userId,
    payload: {
      assetId,
      previousStatus: existing.status,
      nextStatus: "revision_requested",
    },
  })

  try {
    await logAuditEvent({
      action: "asset_rejected",
      entityType: "asset",
      entityId: assetId,
      entityName: existing.title ?? "Untitled",
      metadata: { from: existing.status, to: "revision_requested" },
    })
  } catch {
    // Audit logging should not block rejection.
  }

  return mapped
}

export async function removeAsset(assetId: string): Promise<void> {
  const asset = await getAssetById(assetId)
  if (asset?.drive_file_id) {
    try {
      await deleteFile(asset.drive_file_id)
    } catch {
      console.warn("[asset][delete][r2-cleanup-failed]", {
        assetId,
        key: asset.drive_file_id,
      })
    }
  }
  try {
    await logAuditEvent({
      action: "asset_deleted",
      entityType: "asset",
      entityId: assetId,
      entityName: asset?.title ?? "",
      metadata: { driveFileId: asset?.drive_file_id ?? null },
    })
  } catch {
    // Audit logging should not block deletion.
  }
  await deleteAssetRow(assetId)
}
