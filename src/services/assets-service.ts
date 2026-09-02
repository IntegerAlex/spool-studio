import { contentAssets } from "@/db/schema"
import { deleteFile } from "@/integrations/r2/r2-service"
import { canTransitionStatus } from "@/lib/asset-workflow"
import { getCurrentUser } from "@/lib/auth"
import { emitEvent } from "@/lib/event-bus"
import { listCommentsByAssetId } from "@/repositories/asset-comments-repository"
import { listAssetRevisionsByAssetId } from "@/repositories/asset-revisions-repository"
import {
  deleteAsset as deleteAssetRow,
  getAssetById,
  insertAsset,
  listAssets,
  listAssetsByClientId,
  listAssetsByStatuses,
  publishAssetWithRecord,
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
import {
  mapAsset,
  mapAssetRevisions,
  splitScheduledAt,
  toDate,
} from "@/services/asset-mapping"
import { notifyDesignerOfChange } from "@/services/asset-notifications"
import { logAssetStatusTransition } from "@/services/asset-status"
import type { AssetStatus, AssetType, Json } from "@/types"
import type { Asset } from "@/types/index"

export {
  getAssetR2Key,
  finalizeAssetUpload,
  uploadAssetFile,
  type AssetUploadResult,
  type UploadFinalizationMetadata,
  type AssetUploadFinalizationInput,
} from "@/services/asset-uploads"
export {
  getAssetRevisions,
  setAssetCurrentRevision,
} from "@/services/asset-revisions"

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





export async function getAssets(limit = 200): Promise<Asset[]> {
  const rows = await listAssets(limit)
  const mapped = await Promise.all(rows.map((asset) => mapAsset(asset)))
  return mapped.filter((asset): asset is Asset => Boolean(asset))
}

export async function getAssetsByStatuses(
  statuses: readonly AssetStatus[],
  limit = 200,
): Promise<Asset[]> {
  const rows = await listAssetsByStatuses(statuses, limit)
  const mapped = await Promise.all(rows.map((asset) => mapAsset(asset)))
  return mapped.filter((asset): asset is Asset => Boolean(asset))
}

export async function getAssetsByClientId(clientId: string, limit = 200): Promise<Asset[]> {
  const rows = await listAssetsByClientId(clientId, limit)
  const mapped = await Promise.all(rows.map((asset) => mapAsset(asset)))
  return mapped.filter((asset): asset is Asset => Boolean(asset))
}

export async function getAssetDetail(assetId: string): Promise<Asset | null> {
  const row = await getAssetById(assetId)
  const mapped = await mapAsset(row)
  if (!mapped) return null
  const revisions = await listAssetRevisionsByAssetId(assetId)
  mapped.revisions = await mapAssetRevisions(revisions)
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

  return mapped
}

export async function getAssetSummary(assetId: string): Promise<Asset | null> {
  const row = await getAssetById(assetId)
  return mapAsset(row)
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

  const mapped = await mapAsset(storedRecord)
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
    await publishAssetWithRecord(assetId, updates, publishedAt)
    const refreshed = await getAssetById(assetId)
    if (!refreshed) {
      throw new Error("Asset not found after publication")
    }
    record = refreshed
  } else {
    record = await updateAssetRow(assetId, updates)
  }

  const mapped = await mapAsset(record)
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
    const mapped = await mapAsset(existing)
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

  const mapped = await mapAsset(updated)
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
    const mapped = await mapAsset(existing)
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

  // Handle Notifications: email the assigned designer (skip if self).
  let latestCommentText: string | null = null
  try {
    const comments = await listCommentsByAssetId(assetId, { limit: 1 })
    if (comments && comments.length > 0) {
      latestCommentText = comments[0].message
    }
  } catch {
    // non-blocking
  }

  await notifyDesignerOfChange({
    assetId,
    notificationType: "revision_requested",
    commentMessage: latestCommentText,
    triggeredByUserId: userId,
  })

  const mapped = await mapAsset(updated)
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
