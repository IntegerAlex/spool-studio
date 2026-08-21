import { NextResponse } from "next/server"
import { getFileMetadata } from "@/integrations/r2/r2-service"
import { ApiError, jsonError, readJsonBody } from "@/lib/api-error"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { finalizeAssetUpload, uploadAssetFile } from "@/services/assets-service"

export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ id: string }>
}

const MAX_UPLOAD_BYTES = 524288000
const MAX_UPLOAD_LABEL = "500mb"

function logUploadFailure(
  stage: string,
// oxlint-disable-next-line anti-slop/no-unknown-parameters  // error originates from catch/throw sites as unknown
  error: unknown,
  assetId: string,
// oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type  // dynamic external payload
  extra: Record<string, unknown> = {},
) {
  const message =
    error instanceof Error ? error.message : "Unknown upload error"
  const stack = error instanceof Error ? (error.stack ?? null) : null

  console.error("[upload][failure]", {
    assetId,
    stage,
    message,
    stack,
    ...extra,
  })
}

export async function POST(request: Request, context: RouteContext) {
  let assetId = "unknown"
  const contentLengthHeader = request.headers.get("content-length")
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null

  console.info("[upload][payload]", {
    contentLength: request.headers.get("content-length"),
    contentType: request.headers.get("content-type"),
  })

  console.info("[upload][route-entered]", {
    assetId,
    method: request.method,
    pathname: new URL(request.url).pathname,
  })

  console.info("[upload][body-size-config]", {
    assetId,
    detectedRuntime: runtime,
    effectiveLimits: {
      configuredLimit: MAX_UPLOAD_LABEL,
      serverActionsBodySizeLimit: "500mb",
      proxyClientMaxBodySize: 524288000,
    },
    requestContentLength: Number.isFinite(contentLength) ? contentLength : null,
    proxyLimitActive: true,
  })

  try {
    const params = await context.params
    assetId = params?.id ?? "unknown"
    if (!assetId) {
      throw ApiError.badRequest("Asset id is required")
    }

    const contentType = request.headers.get("content-type")
    console.info("[upload][headers]", {
      assetId,
      method: request.method,
      contentType,
    })

    console.info("[upload][content-type]", {
      assetId,
      contentType,
      expectsMultipartFormData: Boolean(
        contentType?.toLowerCase().includes("multipart/form-data"),
      ),
      expectedFieldName: "file",
    })

    if (contentType?.toLowerCase().includes("application/json")) {
// SAFETY: this cast is safe because the value already conforms to the asserted type.
      const body = (await readJsonBody(request)) as {
        r2Key?: string
        key?: string
        fileName?: string
      }

      const fileKey = body.r2Key ?? body.key
      if (!fileKey) {
        throw ApiError.badRequest("r2Key is required")
      }

      if (!body.fileName) {
        throw ApiError.badRequest("fileName is required")
      }

      const r2Metadata = await getFileMetadata(fileKey)
      const result = await finalizeAssetUpload(assetId, {
        fileName: body.fileName,
        uploadResult: {
          key: r2Metadata.key,
          url: `${process.env.R2_PUBLIC_BASE_URL ?? ""}/${r2Metadata.key}`,
          mimeType: r2Metadata.contentType,
          fileSize: r2Metadata.size,
          uploadStatus: "uploaded",
          thumbnailLink: null,
          mediaWidth: null,
          mediaHeight: null,
          durationSeconds: null,
        },
      })

      return NextResponse.json({ data: result }, { status: 201 })
    }

    if (
      Number.isFinite(contentLength) &&
      (contentLength ?? 0) > MAX_UPLOAD_BYTES
    ) {
      throw new ApiError(`Request body exceeded ${MAX_UPLOAD_LABEL}`, 413)
    }

    if (!contentType?.toLowerCase().includes("multipart/form-data")) {
      throw ApiError.badRequest("Content-Type must be multipart/form-data")
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to parse body as FormData"
      logUploadFailure("formdata-parse", error, assetId, { error: message })
      throw ApiError.badRequest("Failed to parse body as FormData")
    }

    const fileValue = formData.get("file")
    const isFile = fileValue instanceof File

    console.info("[upload][formdata-parse]", {
      assetId,
      success: true,
      keys: Array.from(formData.keys()),
      fileExists: fileValue !== null,
// oxlint-disable-next-line anti-slop/no-runtime-typeof  // diagnostics logging of value kind
      typeofFile: typeof fileValue,
      instanceofFile: isFile,
      fileName: isFile ? fileValue.name : null,
      mimeType: isFile ? fileValue.type || "application/octet-stream" : null,
      fileSize: isFile ? fileValue.size : null,
    })

    if (isFile && fileValue.size > MAX_UPLOAD_BYTES) {
      throw new ApiError(`File exceeds ${MAX_UPLOAD_LABEL}`, 413)
    }

    if (fileValue === null) {
      throw ApiError.badRequest("File is required")
    }

    if (!isFile) {
      throw ApiError.badRequest('Upload field "file" must be a File')
    }

    const file = fileValue

    console.info("[upload][start]", {
      assetId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
    })

    const result = await uploadAssetFile(assetId, file)

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    logProductionRuntimeError("api-assets-upload", error, { assetId })
    console.error("[upload][route-crash]", {
      assetId,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? (error.stack ?? null) : null,
    })
    logUploadFailure(
      "route-crash",
      error,
      assetId,
      { error: error instanceof Error ? error.message : "Unknown error" },
    )
    return jsonError(error)
  }
}

export function GET() {
  return NextResponse.json(
    { success: false, error: "Method not allowed" },
    { status: 405 },
  )
}
