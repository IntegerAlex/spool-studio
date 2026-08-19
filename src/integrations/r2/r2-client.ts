import { S3Client } from "@aws-sdk/client-s3"

let client: S3Client | null = null

export function getR2Client(): S3Client {
  if (client) return client

  const endpoint = process.env.R2_ENDPOINT || "http://localhost:4567"
  const isLocal =
    endpoint.includes("localhost") || endpoint.includes("127.0.0.1")

  client = new S3Client({
    endpoint,
    region: process.env.R2_REGION || (isLocal ? "us-east-1" : "auto"),
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "S3RVER",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "S3RVER",
    },
    forcePathStyle: isLocal, // Cloudflare R2 uses virtual-hosted style
  })

  return client
}

export function getR2BucketName(): string {
  return process.env.R2_BUCKET_NAME || "cms-uploads"
}

export function getR2PublicBaseUrl(): string {
  return process.env.R2_PUBLIC_URL || "http://localhost:4567/cms-uploads"
}

export function getR2AccountId(): string {
  return process.env.R2_API_TOKEN
    ? (process.env.R2_ENDPOINT?.match(/https?:\/\/([^.]+)\.r2/)?.[1] ?? "")
    : ""
}
