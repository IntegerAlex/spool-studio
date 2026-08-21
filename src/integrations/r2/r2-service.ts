import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { getR2BucketName, getR2Client, getR2PublicBaseUrl } from "./r2-client"
import type {
  R2FileMetadata,
  R2PresignedUrlInput,
  R2UploadInput,
  R2UploadResult,
} from "./types"

function generatePublicUrl(key: string): string {
  const base = getR2PublicBaseUrl().replace(/\/+$/, "")
  return `${base}/${key}`
}

function generatePreviewUrl(key: string): string {
  return generatePublicUrl(key)
}

async function uploadFile(input: R2UploadInput): Promise<R2UploadResult> {
  const client = getR2Client()
  const bucketName = getR2BucketName()

  try {
    console.info("[r2][upload] starting upload", {
      bucket: bucketName,
      key: input.key,
      contentType: input.contentType,
      contentLength: input.contentLength ?? null,
    })

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      ContentLength: input.contentLength,
      Metadata: input.metadata,
    })

    const response = await client.send(command)

    console.info("[r2][upload] upload complete", {
      bucket: bucketName,
      key: input.key,
      etag: response.ETag ?? null,
      versionId: response.VersionId ?? null,
    })

    return {
      key: input.key,
      // No public URL exists for a private bucket; drive_file_id is the
      // source of truth and URLs are presigned per-request in assets-service.
      url: null,
      versionId: response.VersionId,
      etag: response.ETag,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown R2 upload error"
    console.error("[r2][upload] upload failed", {
      bucket: bucketName,
      key: input.key,
      message,
    })
    throw new Error(`R2 upload failed for key "${input.key}": ${message}`)
  }
}

async function getPresignedUploadUrl(
  input: R2PresignedUrlInput,
): Promise<{ uploadUrl: string; key: string }> {
  const client = getR2Client()
  const bucketName = getR2BucketName()
  const expiresIn = input.expiresIn ?? 3600

  try {
    console.info("[r2][presign-upload] generating presigned upload url", {
      bucket: bucketName,
      key: input.key,
      expiresIn,
      contentType: input.contentType ?? null,
    })

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: input.key,
      ContentType: input.contentType,
    })

    const uploadUrl = await getSignedUrl(client, command, { expiresIn })

    console.info("[r2][presign-upload] presigned url generated", {
      bucket: bucketName,
      key: input.key,
    })

    return { uploadUrl, key: input.key }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown R2 presign error"
    console.error("[r2][presign-upload] generation failed", {
      bucket: bucketName,
      key: input.key,
      message,
    })
    throw new Error(
      `R2 presigned upload URL generation failed for key "${input.key}": ${message}`,
    )
  }
}

async function getPresignedDownloadUrl(
  key: string,
  expiresIn?: number,
): Promise<string> {
  const client = getR2Client()
  const bucketName = getR2BucketName()
  const ttl = expiresIn ?? 3600

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    const url = await getSignedUrl(client, command, { expiresIn: ttl })

    console.info("[r2][presign-download] presigned url generated", {
      bucket: bucketName,
      key,
      expiresIn: ttl,
    })

    return url
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown R2 presign error"
    console.error("[r2][presign-download] generation failed", {
      bucket: bucketName,
      key,
      message,
    })
    throw new Error(
      `R2 presigned download URL generation failed for key "${key}": ${message}`,
    )
  }
}

async function getFileMetadata(key: string): Promise<R2FileMetadata> {
  const client = getR2Client()
  const bucketName = getR2BucketName()

  try {
    console.info("[r2][metadata] fetching file metadata", {
      bucket: bucketName,
      key,
    })

    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    const response = await client.send(command)

    if (!response.ContentLength || !response.ContentType || !response.ETag) {
      throw new Error("R2 HeadObject response missing required fields")
    }

    return {
      key,
      size: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified ?? new Date(),
      etag: response.ETag,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown R2 metadata error"
    console.error("[r2][metadata] fetch failed", {
      bucket: bucketName,
      key,
      message,
    })
    throw new Error(`R2 metadata fetch failed for key "${key}": ${message}`)
  }
}

async function deleteFile(key: string): Promise<void> {
  const client = getR2Client()
  const bucketName = getR2BucketName()

  try {
    console.info("[r2][delete] deleting file", {
      bucket: bucketName,
      key,
    })

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    await client.send(command)

    console.info("[r2][delete] file deleted", {
      bucket: bucketName,
      key,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown R2 delete error"
    console.error("[r2][delete] deletion failed", {
      bucket: bucketName,
      key,
      message,
    })
    throw new Error(`R2 deletion failed for key "${key}": ${message}`)
  }
}

async function generateDownloadUrl(key: string): Promise<string> {
  return getPresignedDownloadUrl(key)
}

export {
  deleteFile,
  generateDownloadUrl,
  generatePreviewUrl,
  generatePublicUrl,
  getFileMetadata,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  uploadFile,
}
