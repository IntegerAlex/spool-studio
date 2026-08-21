import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { ApiError, jsonError, readJsonBody } from "@/lib/api-error"
import { parseBody } from "@/lib/api-validation"
import {
  canUploadFromStatus,
  canUploadRevisionFromStatus,
} from "@/lib/asset-workflow"
import { getPresignedUploadUrl } from "@/integrations/r2/r2-service"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { getAssetDetail } from "@/services/assets-service"
import { insertUploadSession } from "@/repositories/upload-sessions-repository"

export const runtime = "nodejs"

// Matches proxyClientMaxBodySize in next.config.mjs.
const MAX_UPLOAD_BYTES = 524288000

const ALLOWED_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

const MIME_EXTENSIONS = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} satisfies Record<(typeof ALLOWED_MIME_TYPES)[number], string>

const UploadSessionSchema = z.object({
  assetId: z.string().uuid("assetId must be a valid id"),
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  fileSize: z.number().int().min(0).max(MAX_UPLOAD_BYTES),
})

export async function POST(request: Request) {
  try {
    const user = await requireUser()

    const parsed = parseBody(UploadSessionSchema, await readJsonBody(request))
    if (!parsed.ok) {
      return parsed.response
    }
    const { assetId, fileName, mimeType, fileSize } = parsed.data

    const asset = await getAssetDetail(assetId)
    if (!asset) {
      throw ApiError.notFound("Asset not found")
    }

    // Same asset-state rule as the google-session route.
    const uploadAllowed =
      canUploadFromStatus(asset.status) ||
      canUploadRevisionFromStatus(asset.status)
    if (!uploadAllowed) {
      throw ApiError.conflict("Upload not allowed for the current asset state")
    }

    // Extension derives from the allowlisted mime type, never from the
    // client-supplied fileName.
    const ext = MIME_EXTENSIONS[mimeType]
    const key = `uploads/${user.id}/${assetId}/${randomUUID()}.${ext}`

    const { uploadUrl, key: r2Key } = await getPresignedUploadUrl({
      key,
      contentType: mimeType,
      expiresIn: 3600,
    })

    await insertUploadSession({
      asset_id: assetId,
      user_id: user.id,
      r2_key: r2Key,
      file_name: fileName,
      mime_type: mimeType,
      file_size: fileSize,
      status: "pending",
    })

    return NextResponse.json({ data: { uploadUrl, key: r2Key } })
  } catch (error) {
    logProductionRuntimeError("api-uploads-r2-session", error)
    return jsonError(error)
  }
}
