import { getPresignedDownloadUrl } from "@/integrations/r2/r2-service"

const DEAD_URL_PATTERNS = ["localhost:4567", "r2.cloudflarestorage.com"]

/**
 * A stored file URL that points at a dead/unusable base (local s3rver
 * fallback, private S3 API endpoint). Private buckets have no public
 * URL - access goes through presigned GETs keyed on drive_file_id.
 */
export function isDeadFileUrl(
  url: string | null | undefined,
): url is string | null | undefined {
  return Boolean(
    url && DEAD_URL_PATTERNS.some((pattern) => url.includes(pattern)),
  )
}

export function sanitizeFileUrl(
  url: string | null | undefined,
): string | undefined {
  return isDeadFileUrl(url) ? undefined : (url ?? undefined)
}

/** Presign an R2 object key; returns undefined when no key exists. */
export async function presignFileUrl(
  r2Key: string | null | undefined,
): Promise<string | undefined> {
  return r2Key ? await getPresignedDownloadUrl(r2Key) : undefined
}
