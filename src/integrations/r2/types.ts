export interface R2Config {
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicBaseUrl?: string
  region?: string
}

export interface R2UploadInput {
  key: string
  body: Buffer | ReadableStream
  contentType: string
  contentLength?: number
  metadata?: Record<string, string>
}

export interface R2UploadResult {
  key: string
  url: string
  versionId?: string
  etag?: string
}

export interface R2PresignedUrlInput {
  key: string
  expiresIn?: number
  contentType?: string
}

export interface R2FileMetadata {
  key: string
  size: number
  contentType: string
  lastModified: Date
  etag: string
}
