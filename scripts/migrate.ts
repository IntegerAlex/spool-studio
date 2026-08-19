import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { getPool } from "../src/lib/db"

async function runMigrations() {
  const migrationsDir = join(process.cwd(), "scripts")
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()

  const pool = getPool()
  const client = await pool.connect()

  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id serial PRIMARY KEY,
        filename text NOT NULL UNIQUE,
        applied_at timestamptz DEFAULT now()
      );
    `)

    // Get already applied migrations
    const { rows: applied } = await client.query(
      "SELECT filename FROM _migrations ORDER BY id",
    )
    const appliedSet = new Set(applied.map((r) => r.filename))

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  skip  ${file} (already applied)`)
        continue
      }

      const sql = readFileSync(join(migrationsDir, file), "utf-8")
      console.log(`  apply ${file}...`)

      try {
        await client.query("BEGIN")
        await client.query(sql)
        await client.query("INSERT INTO _migrations (filename) VALUES ($1)", [
          file,
        ])
        await client.query("COMMIT")
        console.log(`  done  ${file}`)
      } catch (err: any) {
        await client.query("ROLLBACK")
        console.error(`  FAIL  ${file}: ${err.message}`)
        // Continue with next migration
      }
    }

    console.log("\nMigrations complete")
  } finally {
    client.release()
    await pool.end()
  }
}

runMigrations().catch((err) => {
  console.error("Migration runner failed:", err.message)
  process.exit(1)
})
