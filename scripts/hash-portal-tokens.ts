// @next/env is CJS; under ESM its named export is not detectable, so use
// the default (module.exports) binding instead.
import nextEnv from "@next/env"
const loadEnvConfig = nextEnv.loadEnvConfig
import { getPool } from "../src/lib/db"
import { hashPortalToken } from "../src/lib/portal-token"

loadEnvConfig(process.cwd())

async function hashPortalTokens() {
  const pool = getPool()
  const client = await pool.connect()

  try {
    // Plaintext UUID tokens are 36 chars; sha256 hex digests are exactly 64.
    const result = await client.query<{ id: string; token: string }>(
      "SELECT id, token FROM portal_tokens WHERE length(token) <> 64 OR token !~ '^[0-9a-f]{64}$'",
    )

    let migrated = 0
    for (const row of result.rows) {
      await client.query("UPDATE portal_tokens SET token = $1 WHERE id = $2", [
        hashPortalToken(row.token),
        row.id,
      ])
      migrated += 1
    }

    console.log(`Migrated ${migrated} portal token(s) to hashed form.`)
  } finally {
    client.release()
    await pool.end()
  }
}

hashPortalTokens().catch((err) => {
  // SAFETY: rejected promise surfaces Error instances; .message is set.
  console.error("Failed:", (err as Error).message)
  process.exit(1)
})
