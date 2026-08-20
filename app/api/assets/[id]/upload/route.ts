import { NextResponse } from "next/server"
import { getFileMetadata } from "@/integrations/r2/r2-service"
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
      return NextResponse.json(
        { success: false, error: "Asset id is required" },
        { status: 400 },
      )
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
      const body = (await request.json()) as {
        r2Key?: string
        key?: string
        fileName?: string
      }

      const fileKey = body.r2Key ?? body.key
      if (!fileKey) {
        return NextResponse.json(
          { success: false, error: "r2Key is required" },
          { status: 400 },
        )
      }

      if (!body.fileName) {
        return NextResponse.json(
          { success: false, error: "fileName is required" },
          { status: 400 },
        )
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

      return NextResponse.json({ success: true, data: result }, { status: 201 })
    }

    if (
      Number.isFinite(contentLength) &&
      (contentLength ?? 0) > MAX_UPLOAD_BYTES
    ) {
      const error = new Error(`Request body exceeded ${MAX_UPLOAD_LABEL}`)
      logUploadFailure("body-size-check", error, assetId, {
        requestContentLength: contentLength,
        configuredLimitBytes: MAX_UPLOAD_BYTES,
        configuredLimit: MAX_UPLOAD_LABEL,
      })
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 413 },
      )
    }

    if (!contentType?.toLowerCase().includes("multipart/form-data")) {
      return NextResponse.json(
        {
          success: false,
          error: "Content-Type must be multipart/form-data",
        },
        { status: 400 },
      )
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
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 },
      )
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
      const error = new Error(`File exceeds ${MAX_UPLOAD_LABEL}`)
      logUploadFailure("file-size-check", error, assetId, {
        configuredLimitBytes: MAX_UPLOAD_BYTES,
        configuredLimit: MAX_UPLOAD_LABEL,
        fileName: fileValue.name,
        fileSize: fileValue.size,
        mimeType: fileValue.type || "application/octet-stream",
      })
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 413 },
      )
    }

    if (fileValue === null) {
      const error = new Error("File is required")
      logUploadFailure("file-extraction", error, assetId, {
        expectedFieldName: "file",
        keys: Array.from(formData.keys()),
        fileExists: false,
        typeofFile: "object",
        instanceofFile: false,
      })
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      )
    }

    if (!isFile) {
      const error = new Error('Upload field "file" must be a File')
      logUploadFailure("file-extraction", error, assetId, {
        expectedFieldName: "file",
        keys: Array.from(formData.keys()),
        fileExists: true,
// oxlint-disable-next-line anti-slop/no-runtime-typeof  // diagnostics logging of value kind
        typeofFile: typeof fileValue,
        instanceofFile: false,
      })
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      )
    }

    const file = fileValue

    console.info("[upload][start]", {
      assetId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
    })

    const result = await uploadAssetFile(assetId, file)

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload asset file"
    logProductionRuntimeError("api-assets-upload", error, { assetId })
    console.error("[upload][route-crash]", {
      assetId,
      message,
      stack: error instanceof Error ? (error.stack ?? null) : null,
    })
    logUploadFailure("route-crash", error, assetId, { error: message })
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    )
  }
}

export function GET() {
  return NextResponse.json(
    { success: false, error: "Method not allowed" },
    { status: 405 },
  )
}
