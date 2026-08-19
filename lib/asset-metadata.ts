import type { Database } from "@/types/database"

export type AssetMediaType = "image" | "video" | "other"

export interface AssetMetadataExtractionInput {
  assetId: string
  file: File
  mimeType: string | null
  fileSize: number
  driveFileId: string
  driveFileUrl: string
  thumbnailUrl: string | null
  uploadedBy: string
  uploadedAt: string
}

export interface AssetMetadataExtractionResult {
  updates: Pick<
    Database["public"]["Tables"]["content_assets"]["Update"],
    | "mime_type"
    | "file_size"
    | "file_extension"
    | "uploaded_at"
    | "uploaded_by"
    | "drive_file_id"
    | "drive_file_url"
    | "thumbnail_url"
    | "media_width"
    | "media_height"
    | "duration_seconds"
  >
  mediaType: AssetMediaType
  extractedFields: Record<string, string | number | null>
  extractionDurationMs: number
  partialFailures: string[]
}

function getExtensionFromName(fileName: string): string | null {
  const lastDot = fileName.lastIndexOf(".")
  if (lastDot <= 0 || lastDot === fileName.length - 1) {
    return null
  }

  return fileName.slice(lastDot + 1).toLowerCase()
}

export function extractFileExtension(fileName: string): string | null {
  return getExtensionFromName(fileName)
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) {
    return "Unknown size"
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  const units = ["KB", "MB", "GB", "TB"]
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function detectMediaType(
  mimeType: string | null | undefined,
  fileExtension: string | null,
): AssetMediaType {
  const normalizedMimeType = (mimeType ?? "").toLowerCase()
  if (normalizedMimeType.startsWith("image/")) {
    return "image"
  }

  if (normalizedMimeType.startsWith("video/")) {
    return "video"
  }

  const imageExtensions = new Set([
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "bmp",
    "avif",
    "heic",
    "heif",
  ])
  const videoExtensions = new Set(["mp4", "mov", "m4v", "webm", "mkv", "avi"])

  if (fileExtension && imageExtensions.has(fileExtension)) {
    return "image"
  }

  if (fileExtension && videoExtensions.has(fileExtension)) {
    return "video"
  }

  return "other"
}

function readUInt32(buffer: Uint8Array, offset: number): number {
  return (
    buffer[offset] * 2 ** 24 +
    buffer[offset + 1] * 2 ** 16 +
    buffer[offset + 2] * 2 ** 8 +
    buffer[offset + 3]
  )
}

function parsePng(
  buffer: Uint8Array,
): { width: number; height: number } | null {
  if (buffer.length < 24) {
    return null
  }

  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (!signature.every((value, index) => buffer[index] === value)) {
    return null
  }

  return {
    width: readUInt32(buffer, 16),
    height: readUInt32(buffer, 20),
  }
}

function parseGif(
  buffer: Uint8Array,
): { width: number; height: number } | null {
  if (buffer.length < 10) {
    return null
  }

  const header = String.fromCharCode(...buffer.slice(0, 6))
  if (header !== "GIF87a" && header !== "GIF89a") {
    return null
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  return {
    width: view.getUint16(6, true),
    height: view.getUint16(8, true),
  }
}

function parseWebp(
  buffer: Uint8Array,
): { width: number; height: number } | null {
  if (buffer.length < 30) {
    return null
  }

  const header = String.fromCharCode(...buffer.slice(0, 4))
  const container = String.fromCharCode(...buffer.slice(8, 12))
  if (header !== "RIFF" || container !== "WEBP") {
    return null
  }

  const chunkType = String.fromCharCode(...buffer.slice(12, 16))
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)

  if (chunkType === "VP8X") {
    const width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16))
    const height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16))
    return { width, height }
  }

  if (chunkType === "VP8 ") {
    if (buffer.length < 30) {
      return null
    }

    const width = view.getUint16(26, true) & 0x3fff
    const height = view.getUint16(28, true) & 0x3fff
    return { width, height }
  }

  if (chunkType === "VP8L") {
    if (buffer.length < 25) {
      return null
    }

    const b1 = buffer[21]
    const b2 = buffer[22]
    const b3 = buffer[23]
    const b4 = buffer[24]
    const width = 1 + (((b2 & 0x3f) << 8) | b1)
    const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6))
    return { width, height }
  }

  return null
}

function parseJpeg(
  buffer: Uint8Array,
): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null
  }

  let offset = 2
  while (offset < buffer.length) {
    while (offset < buffer.length && buffer[offset] !== 0xff) {
      offset += 1
    }

    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset += 1
    }

    const marker = buffer[offset]
    offset += 1

    if (marker === 0xd9 || marker === 0xda) {
      break
    }

    if (offset + 1 >= buffer.length) {
      break
    }

    const segmentLength = (buffer[offset] << 8) | buffer[offset + 1]
    if (segmentLength < 2) {
      break
    }

    const isSofMarker =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)

    if (isSofMarker) {
      if (offset + 7 >= buffer.length) {
        break
      }

      const height = (buffer[offset + 3] << 8) | buffer[offset + 4]
      const width = (buffer[offset + 5] << 8) | buffer[offset + 6]
      return { width, height }
    }

    offset += segmentLength
  }

  return null
}

function parseMp4Boxes(
  buffer: Uint8Array,
  start: number,
  end: number,
  result: {
    durationSeconds: number | null
    width: number | null
    height: number | null
  },
): void {
  let offset = start

  while (offset + 8 <= end) {
    let size = readUInt32(buffer, offset)
    const type = String.fromCharCode(
      buffer[offset + 4],
      buffer[offset + 5],
      buffer[offset + 6],
      buffer[offset + 7],
    )

    let headerSize = 8
    if (size === 1 && offset + 16 <= end) {
      const extendedSize =
        buffer[offset + 8] * 2 ** 56 +
        buffer[offset + 9] * 2 ** 48 +
        buffer[offset + 10] * 2 ** 40 +
        buffer[offset + 11] * 2 ** 32 +
        buffer[offset + 12] * 2 ** 24 +
        buffer[offset + 13] * 2 ** 16 +
        buffer[offset + 14] * 2 ** 8 +
        buffer[offset + 15]
      size = extendedSize
      headerSize = 16
    }

    if (size <= 0) {
      break
    }

    const boxEnd = Math.min(offset + size, end)
    const contentStart = offset + headerSize

    if (
      type === "moov" ||
      type === "trak" ||
      type === "mdia" ||
      type === "minf" ||
      type === "stbl"
    ) {
      parseMp4Boxes(buffer, contentStart, boxEnd, result)
    } else if (type === "mvhd" && contentStart + 20 <= boxEnd) {
      const version = buffer[contentStart]
      const view = new DataView(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength,
      )
      const timescaleOffset =
        version === 1 ? contentStart + 20 : contentStart + 12
      const durationOffset =
        version === 1 ? contentStart + 24 : contentStart + 16
      if (durationOffset + (version === 1 ? 8 : 4) <= boxEnd) {
        const timescale = view.getUint32(timescaleOffset, false)
        const duration =
          version === 1
            ? Number(view.getBigUint64(durationOffset, false))
            : view.getUint32(durationOffset, false)
        if (timescale > 0 && Number.isFinite(duration)) {
          result.durationSeconds = duration / timescale
        }
      }
    } else if (type === "tkhd" && contentStart + 84 <= boxEnd) {
      const view = new DataView(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength,
      )
      const version = buffer[contentStart]
      const widthOffset = version === 1 ? contentStart + 92 : contentStart + 76
      const heightOffset = version === 1 ? contentStart + 96 : contentStart + 80
      if (heightOffset + 4 <= boxEnd) {
        result.width = view.getUint32(widthOffset, false) / 65536
        result.height = view.getUint32(heightOffset, false) / 65536
      }
    }

    offset = boxEnd
  }
}

export async function extractImageMetadata(file: File): Promise<{
  mediaWidth: number | null
  mediaHeight: number | null
  partialFailures: string[]
}> {
  const partialFailures: string[] = []
  try {
    const buffer = new Uint8Array(await file.arrayBuffer())
    const dimensions =
      parsePng(buffer) ??
      parseJpeg(buffer) ??
      parseGif(buffer) ??
      parseWebp(buffer)
    if (!dimensions) {
      partialFailures.push("Unable to parse image dimensions")
    }

    return {
      mediaWidth: dimensions?.width ?? null,
      mediaHeight: dimensions?.height ?? null,
      partialFailures,
    }
  } catch (error) {
    partialFailures.push(
      error instanceof Error ? error.message : "Unknown image metadata error",
    )
    return {
      mediaWidth: null,
      mediaHeight: null,
      partialFailures,
    }
  }
}

export async function extractVideoMetadata(file: File): Promise<{
  mediaWidth: number | null
  mediaHeight: number | null
  durationSeconds: number | null
  partialFailures: string[]
}> {
  const partialFailures: string[] = []
  try {
    const buffer = new Uint8Array(await file.arrayBuffer())
    const parsed = {
      durationSeconds: null as number | null,
      width: null as number | null,
      height: null as number | null,
    }

    parseMp4Boxes(buffer, 0, buffer.length, parsed)

    if (!parsed.width || !parsed.height) {
      partialFailures.push("Unable to parse video dimensions")
    }

    if (parsed.durationSeconds === null) {
      partialFailures.push("Unable to parse video duration")
    }

    return {
      mediaWidth: parsed.width,
      mediaHeight: parsed.height,
      durationSeconds: parsed.durationSeconds,
      partialFailures,
    }
  } catch (error) {
    partialFailures.push(
      error instanceof Error ? error.message : "Unknown video metadata error",
    )
    return {
      mediaWidth: null,
      mediaHeight: null,
      durationSeconds: null,
      partialFailures,
    }
  }
}

export async function extractAssetMetadata(
  input: AssetMetadataExtractionInput,
): Promise<AssetMetadataExtractionResult> {
  const extractionStartedAt = Date.now()
  const fileExtension = extractFileExtension(input.file.name)
  const mediaType = detectMediaType(
    input.mimeType ?? input.file.type,
    fileExtension,
  )

  const updates: AssetMetadataExtractionResult["updates"] = {
    mime_type: input.mimeType ?? input.file.type ?? null,
    file_size: input.fileSize,
    file_extension: fileExtension,
    uploaded_at: input.uploadedAt,
    uploaded_by: input.uploadedBy,
    drive_file_id: input.driveFileId,
    drive_file_url: input.driveFileUrl,
    thumbnail_url: input.thumbnailUrl,
    media_width: null,
    media_height: null,
    duration_seconds: null,
  }

  const partialFailures: string[] = []

  if (mediaType === "image") {
    const imageMetadata = await extractImageMetadata(input.file)
    updates.media_width = imageMetadata.mediaWidth
    updates.media_height = imageMetadata.mediaHeight
    partialFailures.push(...imageMetadata.partialFailures)
  } else if (mediaType === "video") {
    const videoMetadata = await extractVideoMetadata(input.file)
    updates.media_width = videoMetadata.mediaWidth
    updates.media_height = videoMetadata.mediaHeight
    updates.duration_seconds = videoMetadata.durationSeconds
    partialFailures.push(...videoMetadata.partialFailures)
  }

  const extractionDurationMs = Date.now() - extractionStartedAt
  const extractedFields = {
    mimeType: updates.mime_type,
    fileSize: updates.file_size,
    fileExtension: updates.file_extension,
    uploadedAt: updates.uploaded_at,
    uploadedBy: updates.uploaded_by,
    driveFileId: updates.drive_file_id,
    driveFileUrl: updates.drive_file_url,
    thumbnailUrl: updates.thumbnail_url,
    mediaWidth: updates.media_width,
    mediaHeight: updates.media_height,
    durationSeconds: updates.duration_seconds,
  }

  console.info("[asset][metadata-extraction]", {
    assetId: input.assetId,
    mediaType,
    extractedFields,
    extractionDurationMs,
    partialFailures,
  })

  return {
    updates,
    mediaType,
    extractedFields: extractedFields as Record<string, string | number | null>,
    extractionDurationMs,
    partialFailures,
  }
}
