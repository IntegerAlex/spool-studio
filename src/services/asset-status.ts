import type { AssetStatus } from "@/types"

export function logAssetStatusTransition(
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
