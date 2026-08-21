import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
// @next/env is CJS; under ESM its named export is not detectable, so use
// the default (module.exports) binding instead.
import nextEnv from "@next/env"
const loadEnvConfig = nextEnv.loadEnvConfig
import { getPool } from "../src/lib/db"

loadEnvConfig(process.cwd())

const MIGRATIONS_DIR = join(process.cwd(), "drizzle", "migrations")
const journal = JSON.parse(
  readFileSync(join(MIGRATIONS_DIR, "meta", "_journal.json"), "utf-8"),
)

/**
 * Seeds Drizzle's migration journal so the pre-existing schema (represented by
 * the baseline migration) is marked as already applied. Without this,
 * `drizzle-kit migrate` would try to re-create tables that already exist.
 */
async function main() {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query("CREATE SCHEMA IF NOT EXISTS drizzle")
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `)

    const { rowCount } = await client.query(
      "SELECT 1 FROM drizzle.__drizzle_migrations LIMIT 1",
    )
    if (rowCount && rowCount > 0) {
      console.log("Journal already seeded; skipping.")
      return
    }

    // The baseline (0000) reflects the DB state before Drizzle took over.
    const baseline = journal.entries[0]
    const sql = readFileSync(
      join(MIGRATIONS_DIR, `${baseline.tag}.sql`),
      "utf-8",
    )
    const hash = createHash("sha256").update(sql).digest("hex")

    await client.query(
      `INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at")
       VALUES ($1, $2)`,
      [hash, baseline.when],
    )
    console.log(
      `Seeded baseline migration ${baseline.tag} (when=${baseline.when})`,
    )
  } finally {
    client.release()
    await pool.end()
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding failed:", err)
    process.exit(1)
  })
