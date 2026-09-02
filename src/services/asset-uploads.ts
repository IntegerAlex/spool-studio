export function getAssetR2Key(
  clientId: string,
  assetId: string,
  fileName: string,
): string {
  return `clients/${clientId}/assets/${assetId}/${fileName}`
}
