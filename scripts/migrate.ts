import { execSync } from "node:child_process"
import { loadEnvConfig } from "@next/env"

loadEnvConfig(process.cwd())

// The canonical schema lives in drizzle-kit migrations (drizzle/migrations/*).
// This script is a thin convenience wrapper around `drizzle-kit migrate` so the
// documented `tsx scripts/migrate.ts` workflow applies the same migrations.
//
// On a fresh database, `drizzle-kit migrate` creates the journal and applies all
// migrations. If the schema was created by another path (pre-existing baseline),
// run `pnpm db:init` once to seed the migration journal first.
try {
  console.log("Applying Drizzle migrations...")
  execSync("npx drizzle-kit migrate", { stdio: "inherit" })
  console.log("Migrations complete")
} catch (err) {
  // SAFETY: execSync throws Error instances; .message is always present.
  console.error("Migration runner failed:", (err as Error).message)
  process.exit(1)
}
