import { getBucketUsage } from "@/integrations/r2/r2-service"
import { getCurrentUser } from "@/lib/auth"

// Free-tier R2 allowance shown on the dashboard.
export const STORAGE_QUOTA_BYTES = 10 * 1024 * 1024 * 1024

export interface StorageUsage {
  usedBytes: number
  quotaBytes: number
  objects: number
}

// ponytail: in-process TTL cache (one R2 listing per 5 min); move to shared
// cache if multi-instance drift ever matters
let cached: { at: number; value: Omit<StorageUsage, "quotaBytes"> } | null =
  null
const CACHE_TTL_MS = 5 * 60 * 1000

export async function getStorageUsage(): Promise<StorageUsage> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { ...cached.value, quotaBytes: STORAGE_QUOTA_BYTES }
  }

  const usage = await getBucketUsage()
  const value = { usedBytes: usage.bytes, objects: usage.objects }
  cached = { at: Date.now(), value }
  return { ...value, quotaBytes: STORAGE_QUOTA_BYTES }
}
