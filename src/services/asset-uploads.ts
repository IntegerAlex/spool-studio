import { uploadFile } from "@/integrations/r2/r2-service"
import { extractAssetMetadata } from "@/lib/asset-metadata"
import { canTransitionStatus, canUploadRevisionFromStatus } from "@/lib/asset-workflow"
import { getCurrentUser } from "@/lib/auth"
import { emitEvent } from "@/lib/event-bus"
import { sendAssetUploadNotification, sendRevisionUploadNotification } from "@/lib/notifications/mailgun"
import { insertAssetRevision } from "@/repositories/asset-revisions-repository"
import { getAssetById, updateAsset as updateAssetRow } from "@/repositories/assets-repository"
import { getClientById } from "@/repositories/clients-repository"
import { logAssetActivity } from "@/services/activity-service"
import { logAuditEvent } from "@/services/audit-log-service"
import { getOrCreateCurrentUserProfile } from "@/services/users-service"
import { logAssetStatusTransition } from "@/services/asset-status"
import { mapAsset, toDate } from "@/services/asset-mapping"
import type { AssetStatus, Json } from "@/types"
import type { Asset } from "@/types/index"

export function getAssetR2Key(
  clientId: string,
  assetId: string,
  fileName: string,
): string {
  return `clients/${clientId}/assets/${assetId}/${fileName}`
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

export interface AssetUploadResult {
  asset: Asset
  upload: {
    r2Key: string
    fileUrl: string | null
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
  const mapped = await mapAsset(persisted ?? updated)

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
      revisionData = await insertAssetRevision(
        // SAFETY: revisionInsert is a partial revision row built from upload data; the cast
        // narrows to the inferred insert type required by the repository.
        revisionInsert as Parameters<typeof insertAssetRevision>[0],
      )
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
    let mapped = await mapAsset(persisted ?? updated)

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
        driveFileUrl: uploadResult.url ?? null,
        thumbnailUrl: asset.thumbnail_url ?? null,
        uploadedBy: user.id,
        uploadedAt,
      })

      await updateAssetRow(assetId, metadata.updates)
      const refreshed = await getAssetById(assetId)
      const refreshedMapped = await mapAsset(refreshed)
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
          revisionData = await insertAssetRevision(
            // SAFETY: revisionInsert is a partial revision row built from uploaded file metadata;
            // the cast narrows to the inferred insert type required by the repository.
            revisionInsert as Parameters<typeof insertAssetRevision>[0],
          )
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
