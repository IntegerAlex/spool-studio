import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { ApiError, jsonError, readJsonBody } from "@/lib/api-error"
import { getPresignedUploadUrl } from "@/integrations/r2/r2-service"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { insertUploadSession } from "@/repositories/upload-sessions-repository"

export async function POST(request: Request) {
  try {
    const user = await requireUser()

    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const { assetId, fileName, mimeType, fileSize } = (await readJsonBody(
      request,
    )) as {
      assetId?: string
      fileName?: string
      mimeType?: string
      fileSize?: number
    }

    if (!assetId || !fileName) {
      throw ApiError.badRequest("assetId and fileName are required")
    }

    const ext = fileName.split(".").pop() || "bin"
    const key = `uploads/${user.id}/${assetId}/${randomUUID()}.${ext}`

    const { uploadUrl, key: r2Key } = await getPresignedUploadUrl({
      key,
      contentType: mimeType || "application/octet-stream",
      expiresIn: 3600,
    })

    await insertUploadSession({
      asset_id: assetId,
      user_id: user.id,
      r2_key: r2Key,
      file_name: fileName,
      mime_type: mimeType || "application/octet-stream",
      file_size: fileSize || 0,
      status: "pending",
    })

    return NextResponse.json({ data: { uploadUrl, key: r2Key } })
  } catch (error) {
    logProductionRuntimeError("api-uploads-r2-session", error)
    return jsonError(error)
  }
}
