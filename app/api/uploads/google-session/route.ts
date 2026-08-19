import { NextResponse } from "next/server"
import { getPresignedUploadUrl } from "@/integrations/r2/r2-service"
import {
  canUploadFromStatus,
  canUploadRevisionFromStatus,
} from "@/lib/asset-workflow"
import { getCurrentUser } from "@/lib/auth"
import { getAssetDetail, getAssetR2Key } from "@/services/assets-service"

export const runtime = "nodejs"

const MAX_UPLOAD_BYTES = 524288000

interface UploadSessionBody {
  assetId?: string
  clientId?: string
  fileName?: string
  mimeType?: string
  fileSize?: number
}

export async function POST(request: Request) {
  let assetId = "unknown"
  let clientId = "unknown"
  let fileName = "unknown"
  let mimeType = "application/octet-stream"

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      )
    }

    const body = (await request.json()) as UploadSessionBody
    assetId = body.assetId?.trim() ?? "unknown"
    clientId = body.clientId?.trim() ?? "unknown"
    fileName = body.fileName?.trim() ?? "unknown"
    mimeType = body.mimeType?.trim() || "application/octet-stream"
    const fileSize =
      typeof body.fileSize === "number" ? body.fileSize : Number(body.fileSize)

    if (!assetId) {
      return NextResponse.json(
        { success: false, error: "assetId is required" },
        { status: 400 },
      )
    }

    if (!fileName) {
      return NextResponse.json(
        { success: false, error: "fileName is required" },
        { status: 400 },
      )
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json(
        { success: false, error: "fileSize is required" },
        { status: 400 },
      )
    }

    if (fileSize > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { success: false, error: "Request body exceeded 500mb" },
        { status: 413 },
      )
    }

    const asset = await getAssetDetail(assetId)
    if (!asset) {
      return NextResponse.json(
        { success: false, error: "Asset not found" },
        { status: 404 },
      )
    }

    clientId = asset.clientId

    const uploadAllowed =
      canUploadFromStatus(asset.status) ||
      canUploadRevisionFromStatus(asset.status)
    if (!uploadAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Upload not allowed for the current asset state",
        },
        { status: 409 },
      )
    }

    const r2Key = getAssetR2Key(clientId, assetId, fileName)

    const { uploadUrl, key } = await getPresignedUploadUrl({
      key: r2Key,
      contentType: mimeType,
      expiresIn: 3600,
    })

    console.info("[r2-presigned-upload]", {
      assetId,
      presignedUrlGenerated: true,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          uploadUrl,
          key,
          uploadType: "presigned",
          assetId,
          fileName,
          mimeType,
          fileSize,
        },
        uploadUrl,
        key,
        uploadType: "presigned",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[r2-presigned-session]", {
      step: "create-session",
      assetId,
      clientId,
      mimeType,
      fileName,
      message: error instanceof Error ? error.message : "unknown",
      stack: error instanceof Error ? (error.stack ?? null) : null,
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create R2 presigned upload URL",
      },
      { status: 500 },
    )
  }
}
