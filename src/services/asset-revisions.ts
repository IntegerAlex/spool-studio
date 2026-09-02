import {
  getAssetRevisionById,
  listAssetRevisionsByAssetId,
} from "@/repositories/asset-revisions-repository"
import { updateAsset as updateAssetRow } from "@/repositories/assets-repository"
import { logAssetActivity } from "@/services/activity-service"
import { mapAssetRevisions } from "@/services/asset-mapping"
import type { AssetRevision } from "@/types/index"

export async function getAssetRevisions(
  assetId: string,
): Promise<AssetRevision[]> {
  const revisions = await listAssetRevisionsByAssetId(assetId)
  return mapAssetRevisions(revisions)
}

export async function setAssetCurrentRevision(
  assetId: string,
  revisionId: string,
): Promise<void> {
  // Ensure the revision belongs to the asset
  const rev = await getAssetRevisionById(revisionId)
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
