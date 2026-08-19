"use server"

import type { AssetInput } from "@/services/assets-service"
import {
  createAsset,
  getAssetDetail,
  getAssets,
  getAssetsByClientId,
  removeAsset,
  updateAsset,
} from "@/services/assets-service"
import type { Asset } from "@/types/index"

export async function listAssetsAction(): Promise<Asset[]> {
  return getAssets()
}

export async function listAssetsByClientAction(
  clientId: string,
): Promise<Asset[]> {
  return getAssetsByClientId(clientId)
}

export async function getAssetAction(assetId: string): Promise<Asset | null> {
  return getAssetDetail(assetId)
}

export async function createAssetAction(input: AssetInput): Promise<Asset> {
  return createAsset(input)
}

export async function updateAssetAction(
  assetId: string,
  input: Partial<AssetInput>,
): Promise<Asset> {
  return updateAsset(assetId, input)
}

export async function deleteAssetAction(assetId: string): Promise<void> {
  return removeAsset(assetId)
}
