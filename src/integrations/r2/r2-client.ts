import { S3Client } from "@aws-sdk/client-s3"

let client: S3Client | null = null

export function getR2Client(): S3Client {
  if (client) return client

  // Dev defaults target a local MinIO/S3RVER instance; production must
  // configure these explicitly - no silent localhost fallback.
  const isProd = process.env.NODE_ENV === "production"
  const endpoint = process.env.R2_ENDPOINT
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (isProd && (!endpoint || !accessKeyId || !secretAccessKey)) {
    throw new Error(
      "R2_ENDPOINT, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must be set in production - refusing to fall back to localhost credentials",
    )
  }

  const resolvedEndpoint = endpoint ?? "http://localhost:4567"
  const isLocal =
    resolvedEndpoint.includes("localhost") ||
    resolvedEndpoint.includes("127.0.0.1")

  client = new S3Client({
    endpoint: resolvedEndpoint,
    region: process.env.R2_REGION || (isLocal ? "us-east-1" : "auto"),
    credentials: {
      accessKeyId: accessKeyId ?? "S3RVER",
      secretAccessKey: secretAccessKey ?? "S3RVER",
    },
    forcePathStyle: isLocal, // Cloudflare R2 uses virtual-hosted style
  })

  return client
}

export function getR2BucketName(): string {
  return process.env.R2_BUCKET_NAME || "cms-uploads"
}

export function getR2PublicBaseUrl(): string {
  if (process.env.R2_PUBLIC_URL) {
    return process.env.R2_PUBLIC_URL
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "R2_PUBLIC_URL must be set in production - refusing to fall back to a localhost asset URL",
    )
  }
  return "http://localhost:4567/cms-uploads"
}

export function getR2AccountId(): string {
  return process.env.R2_API_TOKEN
    ? (process.env.R2_ENDPOINT?.match(/https?:\/\/([^.]+)\.r2/)?.[1] ?? "")
    : ""
}
