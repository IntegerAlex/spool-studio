import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  JWT_SECRET: z.string().min(32),
  R2_ENDPOINT: z.string().url().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
  R2_REGION: z.string().optional(),
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  MAILGUN_FROM: z.string().optional(),
  MAIL_NOTIFICATION_TO: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(10).optional(),
  DB_IDLE_TIMEOUT: z.coerce.number().int().min(1000).optional(),
  DB_CONNECT_TIMEOUT: z.coerce.number().int().min(1000).optional(),
  APP_URL: z.string().url().optional(),
  SITE_URL: z.string().url().optional(),
})

let _parsed: z.infer<typeof envSchema> | null = null

export function getEnv(): z.infer<typeof envSchema> {
  if (_parsed) return _parsed

  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues
      .filter((i) => i.code === "invalid_type" && i.received === "undefined")
      .map((i) => i.path.join("."))
    if (missing.length > 0) {
      console.error("[env] missing required variables:", missing.join(", "))
    }
    throw new Error(`Environment validation failed: ${result.error.message}`)
  }

  _parsed = result.data
  return _parsed
}
