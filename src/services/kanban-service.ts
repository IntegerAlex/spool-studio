import { sanitizeFileUrl } from "@/lib/file-url"
import { listKanbanAssets } from "@/repositories/assets-repository"
import { listClientOptions } from "@/repositories/clients-repository"
import type { Asset, KanbanClientOption } from "@/types/index"

export interface KanbanBoardData {
  assets: Asset[]
  clients: KanbanClientOption[]
}

function mapKanbanAsset(
  asset: Awaited<ReturnType<typeof listKanbanAssets>>[number],
): Asset {
  return {
    id: asset.id,
    clientId: asset.client_id,
    title: asset.title,
    description: undefined,
    type: asset.type,
    status: asset.status,
    mimeType: asset.mime_type ?? undefined,
    fileSize: undefined,
    fileExtension: asset.file_extension ?? undefined,
    uploadedAt: null,
    uploadedBy: undefined,
    driveFileId: undefined,
    fileUrl: undefined,
    driveFileUrl: undefined,
    thumbnailUrl: sanitizeFileUrl(asset.thumbnail_url),
    mediaWidth: undefined,
    mediaHeight: undefined,
    durationSeconds: undefined,
    createdBy: null,
    createdAt: new Date(asset.created_at),
    updatedAt: new Date(asset.updated_at),
    scheduledAt: null,
    publishDate: asset.publish_date ?? null,
    publishTime: null,
    scheduledBy: null,
    publishedAt: null,
    approvedAt: null,
    approvedBy: null,
    assignedTo: asset.assigned_to ? [asset.assigned_to] : [],
    revisions: [],
    comments: [],
  }
}

export async function getKanbanBoardData(): Promise<KanbanBoardData> {
  const [assets, clients] = await Promise.all([
    listKanbanAssets(),
    listClientOptions(),
  ])

  return {
    assets: assets.map(mapKanbanAsset),
    clients,
  }
}
