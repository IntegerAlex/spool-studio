import {
  generatePreviewUrl,
  generatePublicUrl,
} from "@/integrations/r2/r2-service"
import { getAssetPreviewType } from "@/lib/asset-display"
import type { Asset, AssetRevision } from "@/types/index"

export interface AssetPreviewDescriptor {
  title: string
  mimeType?: string | null
  fileExtension?: string | null
  driveFileId?: string | null
  driveFileUrl?: string | null
  thumbnailUrl?: string | null
  fileSize?: number | null
  durationSeconds?: number | null
}

export interface AssetPreviewUrls {
  openUrl: string | null
  previewUrl: string | null
  viewUrl: string | null
  downloadUrl: string | null
  directMediaUrl: string | null
}

function resolveR2Key(
  input: Pick<AssetPreviewDescriptor, "driveFileId" | "driveFileUrl">,
): string | null {
  if (input.driveFileId) {
    return input.driveFileId
  }
  return null
}

export function getAssetPreviewUrls(
  input: AssetPreviewDescriptor,
): AssetPreviewUrls {
  const previewType = getAssetPreviewType(input)
  const r2Key = resolveR2Key(input)

  const openUrl = r2Key
    ? generatePublicUrl(r2Key)
    : (input.driveFileUrl ?? null)
  const previewUrl = r2Key
    ? generatePreviewUrl(r2Key)
    : (input.driveFileUrl ?? null)
  const viewUrl = r2Key
    ? generatePublicUrl(r2Key)
    : (input.driveFileUrl ?? null)
  const downloadUrl = r2Key
    ? generatePublicUrl(r2Key)
    : (input.driveFileUrl ?? null)

  return {
    openUrl,
    previewUrl,
    viewUrl,
    downloadUrl,
    directMediaUrl:
      previewType === "image"
        ? (input.thumbnailUrl ?? viewUrl ?? openUrl)
        : previewType === "video" || previewType === "audio"
          ? (downloadUrl ?? openUrl)
          : previewType === "document"
            ? (previewUrl ?? openUrl)
            : openUrl,
  }
}

export function toAssetPreviewDescriptor(
  item:
    | Pick<
        Asset,
        | "title"
        | "mimeType"
        | "fileExtension"
        | "driveFileId"
        | "driveFileUrl"
        | "thumbnailUrl"
        | "fileSize"
        | "durationSeconds"
      >
    | (Pick<
        AssetRevision,
        | "mimeType"
        | "driveFileId"
        | "driveFileUrl"
        | "fileSize"
        | "durationSeconds"
      > & {
        title: string
        fileExtension?: string | null
        thumbnailUrl?: string | null
      }),
): AssetPreviewDescriptor {
  return {
    title: item.title,
    mimeType: item.mimeType ?? null,
    fileExtension:
      "fileExtension" in item ? (item.fileExtension ?? null) : null,
    driveFileId: item.driveFileId ?? null,
    driveFileUrl: item.driveFileUrl ?? null,
    thumbnailUrl: "thumbnailUrl" in item ? (item.thumbnailUrl ?? null) : null,
    fileSize: item.fileSize ?? null,
    durationSeconds: item.durationSeconds ?? null,
  }
}
